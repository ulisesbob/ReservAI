import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { ReservationConfirmationEmail } from "@/lib/email-templates/reservation-confirmation"
import { VALID_STATUSES } from "@/lib/validation"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const blocked = applyRateLimit(rateLimiters.reservationRead, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const date = searchParams.get("date")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const sortBy = searchParams.get("sortBy") || "dateTime"
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc"

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (status && status !== "ALL") {
      if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
      }
      where.status = status
    }

    if (date) {
      // Fetch restaurant timezone to calculate correct day boundaries
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: session.restaurantId },
        select: { timezone: true },
      })
      const tz = restaurant?.timezone || "America/Argentina/Buenos_Aires"

      // Calculate UTC offset for the restaurant's timezone
      const sample = new Date(`${date}T12:00:00Z`)
      const localStr = sample.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })
      const localHour = parseInt(localStr, 10)
      const offsetHours = 12 - localHour // positive = ahead of UTC

      const dayStart = new Date(`${date}T00:00:00.000Z`)
      dayStart.setUTCHours(-offsetHours, 0, 0, 0)
      const dayEnd = new Date(`${date}T00:00:00.000Z`)
      dayEnd.setUTCHours(23 - offsetHours, 59, 59, 999)

      where.dateTime = { gte: dayStart, lte: dayEnd }
    }

    if (search && search.trim()) {
      where.OR = [
        { customerName: { contains: search.trim(), mode: "insensitive" } },
        { customerPhone: { contains: search.trim() } },
      ]
    }

    const allowedSorts = ["dateTime", "customerName", "partySize", "status", "createdAt"]
    const orderField = allowedSorts.includes(sortBy) ? sortBy : "dateTime"

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ])

    return NextResponse.json({
      data: reservations,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const blocked = applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

    const session = await requireSession()
    const body = await request.json()

    const { customerName, customerPhone, customerEmail, dateTime, partySize } =
      body

    if (!customerName || !customerPhone || !dateTime || !partySize) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: customerName, customerPhone, dateTime, partySize" },
        { status: 400 }
      )
    }

    if (typeof customerName !== "string" || customerName.length > 200 ||
        typeof customerPhone !== "string" || customerPhone.length > 30 ||
        (customerEmail && (typeof customerEmail !== "string" || customerEmail.length > 255))) {
      return NextResponse.json({ error: "Datos demasiado largos o inválidos" }, { status: 400 })
    }

    const parsedDate = new Date(dateTime)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 })
    }
    if (parsedDate < new Date()) {
      return NextResponse.json({ error: "No se pueden crear reservas en el pasado" }, { status: 400 })
    }

    const size = Number(partySize)
    if (!Number.isInteger(size) || size < 1) {
      return NextResponse.json({ error: "Cantidad de personas debe ser un entero positivo" }, { status: 400 })
    }

    // Validate against restaurant maxPartySize and maxCapacity
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { maxPartySize: true, maxCapacity: true, name: true },
    })

    if (restaurant) {
      if (size > restaurant.maxPartySize) {
        return NextResponse.json(
          { error: `El máximo de personas por reserva es ${restaurant.maxPartySize}` },
          { status: 400 }
        )
      }

      // Check total capacity for that day
      const dayStart = new Date(parsedDate)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(parsedDate)
      dayEnd.setUTCHours(23, 59, 59, 999)

      const dayReservations = await prisma.reservation.aggregate({
        where: {
          restaurantId: session.restaurantId,
          dateTime: { gte: dayStart, lte: dayEnd },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        _sum: { partySize: true },
      })

      const currentOccupancy = dayReservations._sum.partySize ?? 0
      if (currentOccupancy + size > restaurant.maxCapacity) {
        return NextResponse.json(
          { error: `Capacidad máxima del día alcanzada (${restaurant.maxCapacity} personas)` },
          { status: 400 }
        )
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: session.restaurantId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        dateTime: parsedDate,
        partySize: size,
        source: "MANUAL",
        status: "CONFIRMED",
      },
    })

    // Send confirmation email if customer has email
    if (reservation.customerEmail) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: session.restaurantId },
        select: { name: true },
      })

      const dateObj = new Date(reservation.dateTime)
      sendEmail({
        to: reservation.customerEmail,
        subject: `Tu reserva en ${restaurant?.name ?? "el restaurante"}`,
        react: ReservationConfirmationEmail({
          customerName: reservation.customerName,
          restaurantName: restaurant?.name ?? "el restaurante",
          date: dateObj.toLocaleDateString("es-AR"),
          time: dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          partySize: reservation.partySize,
        }),
      }).catch((err) => console.error("Confirmation email failed:", err))
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
