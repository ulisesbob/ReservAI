import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import { ReservationReminderEmail } from "@/lib/email-templates/reservation-reminder"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"

/**
 * Returns UTC start/end of "tomorrow" in the given IANA timezone.
 */
function getTomorrowRangeUTC(tz: string): { start: Date; end: Date } {
  // Get current date parts in the target timezone
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) // returns "YYYY-MM-DD"

  const [year, month, day] = parts.split("-").map(Number)

  // Calculate UTC offset for this timezone by comparing formatted times
  const sample = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0))
  const utcHour = 12
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).format(sample)
  const localHour = parseInt(localParts, 10)
  const offsetHours = utcHour - localHour // positive = timezone is ahead of UTC

  // Tomorrow 00:00 local = Tomorrow 00:00+offset in UTC
  const start = new Date(Date.UTC(year, month - 1, day + 1, -offsetHours, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day + 1, 23 - offsetHours, 59, 59, 999))

  return { start, end }
}

/**
 * Cron endpoint: sends 24h reminder emails for tomorrow's confirmed reservations.
 * Call via Vercel Cron or external scheduler (e.g., daily at 18:00).
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify cron secret — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const expected = `Bearer ${cronSecret}`
  if (
    authHeader.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch all restaurants with WhatsApp config for reminders
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        timezone: true,
        whatsappPhoneId: true,
        whatsappToken: true,
      },
    })

    const emailEnabled = isEmailConfigured()
    let emailSent = 0
    let emailFailed = 0
    let whatsappSent = 0
    let whatsappFailed = 0
    let total = 0

    for (const rest of restaurants) {
      const tz = rest.timezone || "America/Argentina/Buenos_Aires"
      const { start, end } = getTomorrowRangeUTC(tz)

      // Fetch ALL confirmed reservations for tomorrow (not just those with email)
      const reservations = await prisma.reservation.findMany({
        where: {
          restaurantId: rest.id,
          dateTime: { gte: start, lte: end },
          status: "CONFIRMED",
        },
        take: 200,
      })

      // Decrypt WhatsApp token once per restaurant
      const waPhoneId = rest.whatsappPhoneId
      const waToken = rest.whatsappToken ? safeDecrypt(rest.whatsappToken) : null

      for (const r of reservations) {
        total++
        const dateObj = new Date(r.dateTime)
        const dateStr = dateObj.toLocaleDateString("es-AR", { timeZone: tz })
        const timeStr = dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: tz })

        // Send email reminder (if configured and customer has email)
        if (emailEnabled && r.customerEmail) {
          const result = await sendEmail({
            to: r.customerEmail,
            subject: `Recordatorio: tu reserva en ${rest.name} es mañana`,
            react: ReservationReminderEmail({
              customerName: r.customerName,
              restaurantName: rest.name,
              date: dateStr,
              time: timeStr,
              partySize: r.partySize,
            }),
          })
          if (result.success) emailSent++
          else {
            emailFailed++
            console.error(`[cron/reminders] Email failed for ${r.id}:`, result.error)
          }
        }

        // Send WhatsApp reminder (if restaurant has WhatsApp configured)
        if (waPhoneId && waToken && r.customerPhone) {
          try {
            const waMessage =
              `Hola ${r.customerName}! Te recordamos tu reserva en ${rest.name} ` +
              `para mañana ${dateStr} a las ${timeStr} ` +
              `(${r.partySize} ${r.partySize === 1 ? "persona" : "personas"}). ` +
              `¡Te esperamos!`

            await sendWhatsAppMessage(waPhoneId, waToken, r.customerPhone, waMessage)
            whatsappSent++
          } catch (err) {
            whatsappFailed++
            console.error(`[cron/reminders] WhatsApp failed for ${r.id}:`, err)
          }
        }
      }
    }

    const summary = {
      status: "ok",
      total,
      email: { sent: emailSent, failed: emailFailed },
      whatsapp: { sent: whatsappSent, failed: whatsappFailed },
    }
    console.info(`[cron/reminders] Done —`, JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Cron reminders error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
