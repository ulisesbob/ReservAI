import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationRead, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30", 10)))

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const where = {
      restaurantId: session.restaurantId,
      dateTime: { gte: since },
    }

    // All queries in a single Promise.all to eliminate sequential waterfall
    const [total, byStatus, bySource, avgPartySize, dailyCounts, peakHours] = await Promise.all([
      prisma.reservation.count({ where }),

      prisma.reservation.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),

      prisma.reservation.groupBy({
        by: ["source"],
        where,
        _count: true,
      }),

      prisma.reservation.aggregate({
        where,
        _avg: { partySize: true },
      }),

      // Daily reservation counts for chart
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE("dateTime") as day, COUNT(*)::bigint as count
        FROM "Reservation"
        WHERE "restaurantId" = ${session.restaurantId}
          AND "dateTime" >= ${since}
        GROUP BY DATE("dateTime")
        ORDER BY day ASC
      `,

      // Peak hours (was sequential -- now parallel)
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM "dateTime")::int as hour, COUNT(*)::bigint as count
        FROM "Reservation"
        WHERE "restaurantId" = ${session.restaurantId}
          AND "dateTime" >= ${since}
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 5
      `,
    ])

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]))
    const sourceMap = Object.fromEntries(bySource.map((s) => [s.source, s._count]))

    const cancelledCount = statusMap["CANCELLED"] || 0
    const cancellationRate = total > 0 ? Math.round((cancelledCount / total) * 100) : 0

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      total,
      byStatus: statusMap,
      bySource: sourceMap,
      avgPartySize: Math.round((avgPartySize._avg.partySize ?? 0) * 10) / 10,
      cancellationRate,
      peakHours: peakHours.map((h) => ({ hour: h.hour, count: Number(h.count) })),
      dailyCounts: dailyCounts.map((d) => ({ day: String(d.day).split("T")[0], count: Number(d.count) })),
    }, {
      headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" },
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
    console.error("Stats error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
