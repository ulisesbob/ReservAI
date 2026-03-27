import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReservationStatus = any

// No-show threshold: flag customers with 3+ no-shows
const NO_SHOW_FLAG_THRESHOLD = 3

// "NO_SHOW" will be a valid ReservationStatus after the next migration.
// We cast to bypass the stale generated Prisma client until then.
const NO_SHOW_STATUS = "NO_SHOW" as AnyReservationStatus

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationRead, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    const where = {
      restaurantId: session.restaurantId,
      status: NO_SHOW_STATUS,
    }

    const [noShows, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { dateTime: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          dateTime: true,
          partySize: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.reservation.count({ where }),
    ])

    // Compute no-show count per customer (across all time)
    const phones = Array.from(new Set(noShows.map((r) => r.customerPhone)))
    const noShowCounts: Record<string, number> = {}
    if (phones.length > 0) {
      const counts = await prisma.reservation.groupBy({
        by: ["customerPhone"],
        where: {
          restaurantId: session.restaurantId,
          status: NO_SHOW_STATUS,
          customerPhone: { in: phones },
        },
        _count: { customerPhone: true },
      })
      for (const row of counts) {
        const countVal = (row._count as Record<string, number>).customerPhone ?? 0
        noShowCounts[row.customerPhone] = countVal
      }
    }

    // Stats
    const totalNoShows = await prisma.reservation.count({
      where: { restaurantId: session.restaurantId, status: NO_SHOW_STATUS },
    })
    const totalCompleted = await prisma.reservation.count({
      where: {
        restaurantId: session.restaurantId,
        status: { in: ["COMPLETED", NO_SHOW_STATUS] },
      },
    })
    const noShowRate = totalCompleted > 0
      ? Math.round((totalNoShows / totalCompleted) * 100)
      : 0

    // Flag repeat offenders (3+ no-shows)
    const repeatOffenders = await prisma.reservation.groupBy({
      by: ["customerPhone"],
      where: {
        restaurantId: session.restaurantId,
        status: NO_SHOW_STATUS,
      },
      _count: { customerPhone: true },
      having: { customerPhone: { _count: { gte: NO_SHOW_FLAG_THRESHOLD } } },
    })
    const flaggedPhones = new Set(repeatOffenders.map((r) => r.customerPhone))

    const enriched = noShows.map((r) => ({
      ...r,
      noShowCount: noShowCounts[r.customerPhone] ?? 1,
      isFlagged: flaggedPhones.has(r.customerPhone),
    }))

    return NextResponse.json({
      data: enriched,
      stats: {
        totalNoShows,
        noShowRate,
        flaggedCustomers: flaggedPhones.size,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
