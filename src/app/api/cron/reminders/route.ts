import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { ReservationReminderEmail } from "@/lib/email-templates/reservation-reminder"

/**
 * Cron endpoint: sends 24h reminder emails for tomorrow's confirmed reservations.
 * Call via Vercel Cron or external scheduler (e.g., daily at 18:00).
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999)

    // Find all confirmed reservations for tomorrow that have an email
    const reservations = await prisma.reservation.findMany({
      where: {
        dateTime: { gte: tomorrowStart, lte: tomorrowEnd },
        status: "CONFIRMED",
        customerEmail: { not: null },
      },
      include: {
        restaurant: { select: { name: true, timezone: true } },
      },
    })

    let sent = 0
    for (const r of reservations) {
      if (!r.customerEmail) continue

      const dateObj = new Date(r.dateTime)
      try {
        await sendEmail({
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
        sent++
      } catch (err) {
        console.error(`Reminder email failed for reservation ${r.id}:`, err)
      }
    }

    return NextResponse.json({
      message: `Sent ${sent} reminder emails for ${reservations.length} reservations`,
      date: tomorrowStart.toISOString().split("T")[0],
    })
  } catch (error) {
    console.error("Cron reminders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
