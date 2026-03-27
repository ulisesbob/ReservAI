import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { processMessage } from "@/lib/ai-agent"
import type { RestaurantConfig, AgentMessage } from "@/lib/ai-agent"
import { checkAvailability } from "@/lib/availability"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt, verifyWebhookSignature } from "@/lib/encryption"
import { notifyNextInWaitlist, confirmWaitlistEntry, expireAndNotifyNext } from "@/lib/waitlist"

// ---------------------------------------------------------------------------
// Rate limiting — in-memory, per-phone, max 10 messages/minute
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = Date.now()

function checkRateLimit(phone: string): boolean {
  const now = Date.now()

  // Cleanup expired entries every 5 minutes to prevent memory leak
  if (now - lastCleanup > 5 * 60 * 1000) {
    rateLimitMap.forEach((val, key) => {
      if (now > val.resetAt) rateLimitMap.delete(key)
    })
    lastCleanup = now
  }

  const entry = rateLimitMap.get(phone)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// GET — Meta webhook verification
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (
    mode === "subscribe" &&
    token &&
    verifyToken &&
    token.length === verifyToken.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(verifyToken))
  ) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// ---------------------------------------------------------------------------
// POST — Incoming messages from Meta
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Always return 200 to Meta quickly — errors are logged, not surfaced
  try {
    const rawBody = await request.text()

    // Verify webhook signature (HMAC-SHA256) if WHATSAPP_APP_SECRET is set
    const signature = request.headers.get("x-hub-signature-256") || ""
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Webhook signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body: WhatsAppWebhookBody = JSON.parse(rawBody)
    await handleWebhook(body)
  } catch (error) {
    console.error("Webhook processing error:", error)
  }

  return NextResponse.json({ status: "ok" }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Core webhook handler
// ---------------------------------------------------------------------------

interface WhatsAppMessage {
  from: string
  type: string
  text?: { body: string }
}

interface WhatsAppMetadata {
  phone_number_id: string
}

interface WhatsAppValue {
  messaging_product: string
  metadata: WhatsAppMetadata
  messages?: WhatsAppMessage[]
}

interface WhatsAppChange {
  field: string
  value: WhatsAppValue
}

interface WhatsAppEntry {
  changes: WhatsAppChange[]
}

interface WhatsAppWebhookBody {
  object: string
  entry?: WhatsAppEntry[]
}

async function handleWebhook(body: WhatsAppWebhookBody): Promise<void> {
  // Only process WhatsApp Business Account events
  if (body.object !== "whatsapp_business_account") return

  const entries = body.entry ?? []

  for (const entry of entries) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue

      const value = change.value
      const phoneNumberId = value.metadata.phone_number_id
      const messages = value.messages ?? []

      for (const msg of messages) {
        // Only process text messages — skip statuses, read receipts, etc.
        if (msg.type !== "text" || !msg.text?.body) continue

        await processIncomingMessage(
          phoneNumberId,
          msg.from,
          msg.text.body
        )
      }
    }
  }
}

async function processIncomingMessage(
  phoneNumberId: string,
  customerPhone: string,
  messageText: string
): Promise<void> {
  // Rate limit check
  if (!checkRateLimit(customerPhone)) {
    console.warn(`Rate limit exceeded for ${customerPhone}`)
    return
  }

  // 1. Find restaurant by whatsappPhoneId
  const restaurant = await prisma.restaurant.findFirst({
    where: { whatsappPhoneId: phoneNumberId },
  })

  if (!restaurant) {
    console.error(
      `No restaurant found for whatsappPhoneId: ${phoneNumberId}`
    )
    return
  }

  // 2. Expire stale conversations (30+ min without activity)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  await prisma.conversation.updateMany({
    where: {
      restaurantId: restaurant.id,
      customerPhone,
      status: "ACTIVE",
      updatedAt: { lt: thirtyMinAgo },
    },
    data: { status: "EXPIRED" },
  })

  // 3. Find or create active conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      restaurantId: restaurant.id,
      customerPhone,
      status: "ACTIVE",
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        restaurantId: restaurant.id,
        customerPhone,
        status: "ACTIVE",
      },
    })
  }

  // 4. Save incoming message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: messageText,
    },
  })

  // Check if this is a waitlist response
  const notifiedEntry = await prisma.waitlistEntry.findFirst({
    where: {
      restaurantId: restaurant.id,
      customerPhone,
      status: "NOTIFIED",
      expiresAt: { gt: new Date() },
    },
  })

  if (notifiedEntry) {
    const lower = messageText.toLowerCase().trim()
    const affirmative = ["sí", "si", "yes", "dale", "confirmo", "confirmar", "ok", "bueno"]
    const negative = ["no", "cancelar", "cancelo", "paso"]

    if (affirmative.some((w) => lower.includes(w))) {
      const result = await confirmWaitlistEntry(notifiedEntry.id)
      const reply = result.success
        ? "¡Tu reserva fue confirmada! Te esperamos."
        : `No se pudo confirmar: ${result.error}`
      await prisma.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } })
      if (restaurant.whatsappToken) {
        const decryptedToken = safeDecrypt(restaurant.whatsappToken)
        await sendWhatsAppMessage(phoneNumberId, decryptedToken, customerPhone, reply)
      }
      return
    }

    if (negative.some((w) => lower.includes(w))) {
      await prisma.waitlistEntry.update({ where: { id: notifiedEntry.id }, data: { status: "CANCELLED" } })
      await notifyNextInWaitlist(restaurant.id, notifiedEntry.dateTime, notifiedEntry.partySize)
      const reply = "Entendido, cancelamos tu lugar en la lista de espera."
      await prisma.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } })
      if (restaurant.whatsappToken) {
        const decryptedToken = safeDecrypt(restaurant.whatsappToken)
        await sendWhatsAppMessage(phoneNumberId, decryptedToken, customerPhone, reply)
      }
      return
    }
  }

  // Skip bot processing if conversation is escalated
  if (conversation.status === "ESCALATED") {
    return
  }

  // Expire stale waitlist entries
  await expireAndNotifyNext(restaurant.id)

  // 5. Load conversation history (last 20 messages)
  const dbMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  })

  const history: AgentMessage[] = dbMessages.slice(0, -1).map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }))

  // 6. Build restaurant config for AI agent
  // Decrypt sensitive fields before use
  const decryptedOpenaiKey = restaurant.openaiApiKey
    ? safeDecrypt(restaurant.openaiApiKey)
    : null

  const restaurantConfig: RestaurantConfig = {
    name: restaurant.name,
    timezone: restaurant.timezone,
    knowledgeBase: restaurant.knowledgeBase,
    operatingHours: restaurant.operatingHours as Record<
      string,
      unknown
    > | null,
    maxPartySize: restaurant.maxPartySize,
    maxCapacity: restaurant.maxCapacity,
    openaiApiKey: decryptedOpenaiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    escalationPhone: (restaurant as any).escalationPhone as string | null | undefined,
  }

  // 7. Call AI agent
  let agentResponse
  try {
    agentResponse = await processMessage(
      restaurantConfig,
      history,
      messageText
    )
  } catch (error) {
    console.error("AI agent error:", error)
    agentResponse = {
      text: "Disculpa, estoy teniendo problemas. Por favor intenta de nuevo en unos minutos.",
      reservation: null,
    }
  }

  let responseText = agentResponse.text

  // 8. If reservation data, validate availability and create
  if (agentResponse.reservation) {
    const r = agentResponse.reservation
    const dateTime = new Date(`${r.fecha}T${r.hora}:00`)

    const availability = await checkAvailability({
      restaurantId: restaurant.id,
      dateTime,
      partySize: r.personas,
      maxPartySize: restaurant.maxPartySize,
      maxCapacity: restaurant.maxCapacity,
      operatingHours: restaurant.operatingHours as Record<
        string,
        { open: string; close: string }
      > | null,
      timezone: restaurant.timezone,
    })

    if (availability.available) {
      const reservation = await prisma.reservation.create({
        data: {
          restaurantId: restaurant.id,
          customerName: r.nombre,
          customerPhone,
          customerEmail: r.contacto.includes("@")
            ? r.contacto
            : null,
          dateTime,
          partySize: r.personas,
          status: "CONFIRMED",
          source: "WHATSAPP",
        },
      })

      // Link reservation to conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          reservationId: reservation.id,
          status: "COMPLETED",
        },
      })
    } else {
      // Append availability error so the customer knows
      responseText += `\n\n${availability.reason}`
    }
  }

  // Handle tool calls (cancellations, escalation)
  if (agentResponse.toolCall) {
    const { name, arguments: args } = agentResponse.toolCall

    if (name === "buscar_reservas") {
      const reservations = await prisma.reservation.findMany({
        where: {
          restaurantId: restaurant.id,
          customerPhone: { contains: String(args.telefono || customerPhone) },
          status: { in: ["CONFIRMED", "PENDING", "PENDING_DEPOSIT"] },
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: "asc" },
        take: 10,
      })

      if (reservations.length === 0) {
        responseText = "No encontré reservas futuras a tu nombre."
      } else if (reservations.length === 1) {
        const r = reservations[0]
        const dateStr = r.dateTime.toLocaleDateString("es-AR", {
          timeZone: restaurant.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
        })
        const timeStr = r.dateTime.toLocaleTimeString("es-AR", {
          timeZone: restaurant.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        responseText =
          `Tenés una reserva para ${r.partySize} personas el ${dateStr} a las ${timeStr} a nombre de ${r.customerName}. ` +
          `¿Confirmás que querés cancelarla?`
        // Store reservation id temporarily in conversation for next message confirmation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { reservationId: r.id },
        })
      } else {
        responseText =
          "Tus reservas:\n" +
          reservations
            .map((r, i) => {
              const dateStr = r.dateTime.toLocaleDateString("es-AR", {
                timeZone: restaurant.timezone,
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              const timeStr = r.dateTime.toLocaleTimeString("es-AR", {
                timeZone: restaurant.timezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              return `${i + 1}. ${dateStr} a las ${timeStr} — ${r.partySize} personas (${r.customerName})`
            })
            .join("\n") +
          "\n\n¿Cuál querés cancelar? Respondé con el número."
      }
    }

    if (name === "cancelar_reserva") {
      const reservationId = String(args.reservationId)
      const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, restaurantId: restaurant.id },
      })

      if (!reservation) {
        responseText = "No encontré esa reserva."
      } else if (reservation.status === "CANCELLED") {
        responseText = "Esa reserva ya estaba cancelada."
      } else {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "CANCELLED" },
        })
        // Free up waitlist spot
        notifyNextInWaitlist(restaurant.id, reservation.dateTime, reservation.partySize).catch(
          (err) => console.error("Waitlist notification error:", err)
        )
        const dateStr = reservation.dateTime.toLocaleDateString("es-AR", {
          timeZone: restaurant.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
        })
        const timeStr = reservation.dateTime.toLocaleTimeString("es-AR", {
          timeZone: restaurant.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        responseText =
          `Tu reserva del ${dateStr} a las ${timeStr} para ${reservation.partySize} personas fue cancelada exitosamente. ` +
          `Si querés hacer una nueva reserva, escribime cuando quieras.`
      }
    }

    if (name === "escalar_a_humano") {
      const escalateArgs = args as { motivo?: string; resumen?: string }
      const motivo = String(escalateArgs.motivo || "solicitud_cliente")
      const resumen = String(escalateArgs.resumen || "Sin resumen")

      // Mark conversation as escalated
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: "ESCALATED",
          escalatedAt: new Date(),
          escalatedReason: motivo,
        },
      })

      // Send WhatsApp notification to restaurant owner if escalationPhone is configured
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ownerEscalationPhone = (restaurant as any).escalationPhone as string | null | undefined
      if (ownerEscalationPhone && restaurant.whatsappToken && restaurant.whatsappPhoneId) {
        const decryptedToken = safeDecrypt(restaurant.whatsappToken)
        const ownerMessage =
          `*Nueva conversacion escalada — ${restaurant.name}*\n\n` +
          `*Motivo:* ${motivo}\n` +
          `*Cliente:* ${customerPhone}\n` +
          `*Resumen:* ${resumen}\n\n` +
          `Ingresa al dashboard para ver el historial completo.`
        // NOTE: WhatsApp Business API requires prior interaction from the recipient
        // or an approved message template to send outbound messages. If this fails
        // with a 403/131047 error, the owner must message the bot first, or an
        // approved template must be configured in Meta Business Manager.
        sendWhatsAppMessage(
          restaurant.whatsappPhoneId,
          decryptedToken,
          ownerEscalationPhone,
          ownerMessage
        ).catch((err) =>
          console.warn(
            `[WARN] Escalation WhatsApp notification failed for restaurant ${restaurant.id} ` +
            `(ownerPhone=${ownerEscalationPhone}, motivo=${motivo}):`,
            err
          )
        )
      }

      // responseText was already set by the agent: "Te estoy conectando con el equipo..."
    }
  }

  // Fallback: handle legacy [ESCALATE:...] text markers for backwards compatibility
  const escalateMatch = responseText.match(/\[ESCALATE:([^\]]+)\]/)
  if (escalateMatch) {
    responseText = responseText.replace(/\[ESCALATE:[^\]]+\]\s*/g, "").trim()
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "ESCALATED", escalatedAt: new Date(), escalatedReason: escalateMatch[1] },
    })
  }

  // 9. Save assistant response
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: responseText,
    },
  })

  // 10. Send reply via WhatsApp — decrypt token before use
  if (restaurant.whatsappToken) {
    const decryptedToken = safeDecrypt(restaurant.whatsappToken)
    await sendWhatsAppMessage(
      phoneNumberId,
      decryptedToken,
      customerPhone,
      responseText
    )
  } else {
    console.warn(
      `No whatsappToken for restaurant ${restaurant.id} — skipping send`
    )
  }
}
