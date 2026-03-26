import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import { ReservationReminderEmail } from "@/lib/email-templates/reservation-reminder"

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

  // Bail out early with a clear warning when email is not configured.
  if (!isEmailConfigured()) {
    console.warn("[cron/reminders] Skipping — RESEND_API_KEY is not configured.")
    return NextResponse.json({ status: "skipped", reason: "email_not_configured" })
  }

  try {
    // Fetch all restaurants to query per-timezone
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, timezone: true },
    })

    let sent = 0
    let failed = 0
    let total = 0

    for (const rest of restaurants) {
      const tz = rest.timezone || "America/Argentina/Buenos_Aires"
      const { start, end } = getTomorrowRangeUTC(tz)

      const reservations = await prisma.reservation.findMany({
        where: {
          restaurantId: rest.id,
          dateTime: { gte: start, lte: end },
          status: "CONFIRMED",
          customerEmail: { not: null },
        },
        take: 100,
      })

      for (const r of reservations) {
        if (!r.customerEmail) continue
        total++

        const dateObj = new Date(r.dateTime)
        const result = await sendEmail({
          to: r.customerEmail,
          subject: `Recordatorio: tu reserva en ${rest.name} es mañana`,
          react: ReservationReminderEmail({
            customerName: r.customerName,
            restaurantName: rest.name,
            date: dateObj.toLocaleDateString("es-AR", { timeZone: tz }),
            time: dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: tz }),
            partySize: r.partySize,
          }),
        })

        if (result.success) {
          sent++
        } else {
          failed++
          console.error(`[cron/reminders] Failed for reservation ${r.id} (${r.customerEmail}):`, result.error)
        }
      }
    }

    console.info(`[cron/reminders] Done — sent: ${sent}, failed: ${failed}, total: ${total}`)
    return NextResponse.json({ status: "ok", sent, failed, total })
  } catch (error) {
    console.error("Cron reminders error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
