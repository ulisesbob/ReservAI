import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { waitlistCreateSchema, parseBody } from "@/lib/schemas"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { checkAvailability } from "@/lib/availability"

// GET — List waitlist entries (authenticated, dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = request.nextUrl
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = { restaurantId: session.restaurantId }
    if (status) where.status = status
    if (date) {
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setUTCHours(23, 59, 59, 999)
      where.dateTime = { gte: dayStart, lte: dayEnd }
    }

    const entries = await prisma.waitlistEntry.findMany({
      where,
      orderBy: [{ dateTime: "asc" }, { createdAt: "asc" }],
    })
    return NextResponse.json(entries)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — Join waitlist (public, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const blocked = applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

    const body = await request.json()
    const parsed = parseBody(waitlistCreateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { restaurantId, customerName, customerPhone, customerEmail, dateTime, partySize } = parsed.data
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { maxPartySize: true, maxCapacity: true, operatingHours: true, timezone: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }

    const parsedDate = new Date(dateTime)
    const availability = await checkAvailability({
      restaurantId, dateTime: parsedDate, partySize,
      maxPartySize: restaurant.maxPartySize, maxCapacity: restaurant.maxCapacity,
      operatingHours: restaurant.operatingHours as Record<string, { open: string; close: string }> | null,
      timezone: restaurant.timezone,
    })

    if (availability.available) {
      return NextResponse.json({ error: "Hay capacidad disponible, no es necesario unirse a la lista de espera" }, { status: 400 })
    }

    const existing = await prisma.waitlistEntry.findFirst({
      where: { restaurantId, customerPhone, dateTime: parsedDate, status: { in: ["WAITING", "NOTIFIED"] } },
    })
    if (existing) {
      return NextResponse.json({ error: "Ya estás en la lista de espera para este horario" }, { status: 409 })
    }

    const entry = await prisma.waitlistEntry.create({
      data: { restaurantId, customerName, customerPhone, customerEmail: customerEmail || null, dateTime: parsedDate, partySize },
    })

    const position = await prisma.waitlistEntry.count({
      where: { restaurantId, dateTime: parsedDate, status: "WAITING", createdAt: { lte: entry.createdAt } },
    })

    return NextResponse.json({ ...entry, position }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
