import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { processMessage } from "@/lib/ai-agent"
import { checkAvailability } from "@/lib/availability"
import { safeDecrypt } from "@/lib/encryption"
import { checkRateLimit, rateLimiters, getClientIp } from "@/lib/rate-limit"
import type { AgentMessage, RestaurantConfig } from "@/lib/ai-agent"

export async function POST(request: Request) {
  try {
    // Rate limit: 10 requests per IP per minute
    const ip = getClientIp(request)
    const rl = checkRateLimit(rateLimiters.agentTest, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const session = await requireSession()
    const body = await request.json()

    const { message, conversationId } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Se requiere el campo 'message'" },
        { status: 400 }
      )
    }

    // Fetch restaurant config
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      )
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          restaurantId: session.restaurantId,
          status: "ACTIVE",
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversación no encontrada o no activa" },
          { status: 404 }
        )
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          restaurantId: session.restaurantId,
          customerPhone: "test-manual",
        },
        include: { messages: true },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    })

    // Build history from existing messages
    const history: AgentMessage[] = conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }))

    // Call AI agent
    // Decrypt openaiApiKey if present
    const decryptedOpenaiKey = restaurant.openaiApiKey
      ? safeDecrypt(restaurant.openaiApiKey)
      : null

    const restaurantConfig: RestaurantConfig = {
      name: restaurant.name,
      timezone: restaurant.timezone,
      knowledgeBase: restaurant.knowledgeBase,
      operatingHours: restaurant.operatingHours as Record<string, unknown> | null,
      maxPartySize: restaurant.maxPartySize,
      maxCapacity: restaurant.maxCapacity,
      openaiApiKey: decryptedOpenaiKey,
    }

    const agentResponse = await processMessage(
      restaurantConfig,
      history,
      message
    )

    // If reservation data was extracted, validate and create
    let createdReservation = null
    if (agentResponse.reservation) {
      const r = agentResponse.reservation
      const dateTime = new Date(`${r.fecha}T${r.hora}:00`)

      const availability = await checkAvailability({
        restaurantId: session.restaurantId,
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
        createdReservation = await prisma.reservation.create({
          data: {
            restaurantId: session.restaurantId,
            customerName: r.nombre,
            customerPhone: r.contacto,
            customerEmail: null,
            dateTime,
            partySize: r.personas,
            source: "WHATSAPP",
            status: "CONFIRMED",
          },
        })

        // Link conversation to reservation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            reservationId: createdReservation.id,
            status: "COMPLETED",
          },
        })
      } else {
        // Availability check failed — the AI response text still goes through,
        // but we don't create the reservation. The agent should handle this
        // in subsequent messages.
        console.log("Availability check failed:", availability.reason)
      }
    }

    // Save assistant response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: agentResponse.text,
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      text: agentResponse.text,
      reservation: createdReservation,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Agent test error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
