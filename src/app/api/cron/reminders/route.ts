import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import { ReservationReminderEmail } from "@/lib/email-templates/reservation-reminder"

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
  // This avoids flooding logs with one error per reservation.
  if (!isEmailConfigured()) {
    console.warn("[cron/reminders] Skipping — RESEND_API_KEY is not configured.")
    return NextResponse.json({ status: "skipped", reason: "email_not_configured" })
  }

  try {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999)

    // Find confirmed reservations for tomorrow that have an email (batch limit)
    const reservations = await prisma.reservation.findMany({
      where: {
        dateTime: { gte: tomorrowStart, lte: tomorrowEnd },
        status: "CONFIRMED",
        customerEmail: { not: null },
      },
      include: {
        restaurant: { select: { name: true, timezone: true } },
      },
      take: 500,
    })

    let sent = 0
    let failed = 0

    for (const r of reservations) {
      if (!r.customerEmail) continue

      const dateObj = new Date(r.dateTime)
      const result = await sendEmail({
        to: r.customerEmail,
        subject: `Recordatorio: tu reserva en ${r.restaurant.name} es mañana`,
        react: ReservationReminderEmail({
          customerName: r.customerName,
          restaurantName: r.restaurant.name,
          date: dateObj.toLocaleDateString("es-AR"),
          time: dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
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

    console.info(`[cron/reminders] Done — sent: ${sent}, failed: ${failed}, total: ${reservations.length}`)
    return NextResponse.json({ status: "ok", sent, failed, total: reservations.length })
  } catch (error) {
    console.error("Cron reminders error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
