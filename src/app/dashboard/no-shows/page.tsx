import { requireSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NoShowsClient } from "./no-shows-client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReservationStatus = any
const NO_SHOW_STATUS = "NO_SHOW" as AnyReservationStatus
const NO_SHOW_FLAG_THRESHOLD = 3

export default async function NoShowsPage() {
  const session = await requireSession()
  const page = 1
  const limit = 20

  const where = {
    restaurantId: session.restaurantId,
    status: NO_SHOW_STATUS,
  }

  // Fetch no-shows, stats, and recent reservations in parallel
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const [noShows, total, allCounts, totalCompleted, recentRaw] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { dateTime: "desc" },
      skip: 0,
      take: limit,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        dateTime: true,
        partySize: true,
        status: true,
      },
    }),
    prisma.reservation.count({ where }),
    prisma.reservation.groupBy({
      by: ["customerPhone"],
      where: { restaurantId: session.restaurantId, status: NO_SHOW_STATUS },
      _count: { customerPhone: true },
    }),
    prisma.reservation.count({
      where: {
        restaurantId: session.restaurantId,
        status: { in: ["COMPLETED", NO_SHOW_STATUS] },
      },
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: "CONFIRMED",
        dateTime: { lt: new Date() },
      },
      orderBy: { dateTime: "desc" },
      take: 20,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        dateTime: true,
        partySize: true,
        status: true,
      },
    }),
  ])

  // Build no-show counts and flagged set
  const noShowCounts: Record<string, number> = {}
  const flaggedPhones = new Set<string>()
  for (const row of allCounts) {
    const countVal = (row._count as Record<string, number>).customerPhone ?? 0
    noShowCounts[row.customerPhone] = countVal
    if (countVal >= NO_SHOW_FLAG_THRESHOLD) {
      flaggedPhones.add(row.customerPhone)
    }
  }

  const noShowRate = totalCompleted > 0
    ? Math.round((total / totalCompleted) * 100)
    : 0

  const enrichedNoShows = noShows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    dateTime: r.dateTime.toISOString(),
    partySize: r.partySize,
    status: r.status as string,
    noShowCount: noShowCounts[r.customerPhone] ?? 1,
    isFlagged: flaggedPhones.has(r.customerPhone),
  }))

  const recentReservations = recentRaw.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    dateTime: r.dateTime.toISOString(),
    partySize: r.partySize,
    status: r.status as string,
  }))

  return (
    <NoShowsClient
      initialNoShows={enrichedNoShows}
      initialStats={{
        totalNoShows: total,
        noShowRate,
        flaggedCustomers: flaggedPhones.size,
      }}
      initialPagination={{
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }}
      initialRecentReservations={recentReservations}
    />
  )
}
