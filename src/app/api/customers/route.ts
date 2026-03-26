import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"


export async function GET(request: Request) {
  try {
    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const restaurantId = session.restaurantId
    const searchPattern = search ? `%${search}%` : null

    // Use two separate tagged template queries — no $queryRawUnsafe
    let customers: Array<{
      customerPhone: string
      customerName: string
      customerEmail: string | null
      totalReservations: bigint
      totalGuests: bigint
      lastVisit: Date
      firstVisit: Date
    }>
    let totalResult: Array<{ count: bigint }>

    if (searchPattern) {
      customers = await prisma.$queryRaw`
        SELECT
          r."customerPhone",
          MAX(r."customerName") as "customerName",
          MAX(r."customerEmail") as "customerEmail",
          COUNT(*)::bigint as "totalReservations",
          SUM(r."partySize")::bigint as "totalGuests",
          MAX(r."dateTime") as "lastVisit",
          MIN(r."dateTime") as "firstVisit"
        FROM "Reservation" r
        WHERE r."restaurantId" = ${restaurantId}
          AND (r."customerName" ILIKE ${searchPattern} OR r."customerPhone" ILIKE ${searchPattern})
        GROUP BY r."customerPhone"
        ORDER BY "lastVisit" DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      totalResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT r."customerPhone")::bigint as count
        FROM "Reservation" r
        WHERE r."restaurantId" = ${restaurantId}
          AND (r."customerName" ILIKE ${searchPattern} OR r."customerPhone" ILIKE ${searchPattern})
      `
    } else {
      customers = await prisma.$queryRaw`
        SELECT
          r."customerPhone",
          MAX(r."customerName") as "customerName",
          MAX(r."customerEmail") as "customerEmail",
          COUNT(*)::bigint as "totalReservations",
          SUM(r."partySize")::bigint as "totalGuests",
          MAX(r."dateTime") as "lastVisit",
          MIN(r."dateTime") as "firstVisit"
        FROM "Reservation" r
        WHERE r."restaurantId" = ${restaurantId}
        GROUP BY r."customerPhone"
        ORDER BY "lastVisit" DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      totalResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT r."customerPhone")::bigint as count
        FROM "Reservation" r
        WHERE r."restaurantId" = ${restaurantId}
      `
    }

    const total = Number(totalResult[0]?.count ?? 0)

    return NextResponse.json({
      data: customers.map((c) => ({
        customerPhone: c.customerPhone,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        totalReservations: Number(c.totalReservations),
        totalGuests: Number(c.totalGuests),
        lastVisit: c.lastVisit,
        firstVisit: c.firstVisit,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    console.error("Customers error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
