import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import { DailyDigestEmail } from "@/lib/email-templates/daily-digest"

/**
 * Returns UTC start/end of "yesterday" in the given IANA timezone.
 */
function getYesterdayRangeUTC(tz: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

  const [year, month, day] = parts.split("-").map(Number)

  const sample = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const utcHour = 12
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).format(sample)
  const localHour = parseInt(localParts, 10)
  const offsetHours = utcHour - localHour

  // Yesterday in local time
  const start = new Date(Date.UTC(year, month - 1, day - 1, -offsetHours, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day - 1, 23 - offsetHours, 59, 59, 999))

  const label = new Date(Date.UTC(year, month - 1, day - 1)).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: tz,
  })

  return { start, end, label }
}

/**
 * GET /api/cron/daily-digest
 *
 * Sends a daily summary email to restaurant owners at 8am with yesterday's stats.
 * Protected by CRON_SECRET header. Add to vercel.json crons at "0 11 * * *" (11 UTC = 8am ART).
 */
export async function GET(request: Request) {
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

  if (!isEmailConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Email not configured" })
  }

  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
      },
    })

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const rest of restaurants) {
      if (!rest.email) {
        skipped++
        continue
      }

      const tz = rest.timezone || "America/Argentina/Buenos_Aires"
      const { start, end, label } = getYesterdayRangeUTC(tz)

      // Fetch yesterday's reservation stats in a single query
      const [allReservations, noShows] = await Promise.all([
        prisma.reservation.findMany({
          where: {
            restaurantId: rest.id,
            createdAt: { gte: start, lte: end },
          },
          select: { status: true, partySize: true },
        }),
        prisma.reservation.count({
          where: {
            restaurantId: rest.id,
            dateTime: { gte: start, lte: end },
            status: "NO_SHOW",
          },
        }),
      ])

      const newReservations = allReservations.filter(
        (r) => !["CANCELLED"].includes(r.status)
      ).length
      const cancellations = allReservations.filter((r) => r.status === "CANCELLED").length
      const totalGuests = allReservations
        .filter((r) => !["CANCELLED", "NO_SHOW"].includes(r.status))
        .reduce((sum, r) => sum + r.partySize, 0)

      // Skip if nothing happened
      if (newReservations === 0 && cancellations === 0 && noShows === 0) {
        skipped++
        continue
      }

      const result = await sendEmail({
        to: rest.email,
        subject: `Resumen de ayer — ${rest.name} (${label})`,
        react: DailyDigestEmail({
          restaurantName: rest.name,
          date: label,
          newReservations,
          cancellations,
          noShows,
          totalGuests,
        }),
      })

      if (result.success) {
        sent++
      } else if (!("skipped" in result) || !result.skipped) {
        failed++
        console.error(`[cron/daily-digest] Failed for restaurant ${rest.id}:`, result.error)
      } else {
        skipped++
      }
    }

    const summary = { status: "ok", sent, failed, skipped }
    console.info("[cron/daily-digest] Done —", JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[cron/daily-digest] Unhandled error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
