import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Only allow updating safe fields
    const { customerName, customerPhone, customerEmail, dateTime, partySize, status } = body
    const data: Record<string, unknown> = {}

    if (customerName !== undefined) data.customerName = customerName
    if (customerPhone !== undefined) data.customerPhone = customerPhone
    if (customerEmail !== undefined) data.customerEmail = customerEmail
    if (dateTime !== undefined) {
      const parsedDate = new Date(dateTime)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 })
      }
      if (parsedDate < new Date()) {
        return NextResponse.json({ error: "No se pueden mover reservas al pasado" }, { status: 400 })
      }
      data.dateTime = parsedDate
    }

    // Fetch restaurant limits for validation
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { maxPartySize: true, maxCapacity: true },
    })

    if (partySize !== undefined) {
      const size = Number(partySize)
      if (!Number.isInteger(size) || size < 1) {
        return NextResponse.json({ error: "partySize debe ser un entero positivo" }, { status: 400 })
      }
      if (restaurant && size > restaurant.maxPartySize) {
        return NextResponse.json(
          { error: `El máximo de personas por reserva es ${restaurant.maxPartySize}` },
          { status: 400 }
        )
      }
      data.partySize = size
    }

    // Validate capacity if partySize or dateTime changed
    if (restaurant && (partySize !== undefined || dateTime !== undefined)) {
      const targetDate = (data.dateTime as Date) ?? existing.dateTime
      const targetSize = (data.partySize as number) ?? existing.partySize
      const dayStart = new Date(targetDate)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setUTCHours(23, 59, 59, 999)

      const dayReservations = await prisma.reservation.aggregate({
        where: {
          restaurantId: session.restaurantId,
          dateTime: { gte: dayStart, lte: dayEnd },
          status: { in: ["PENDING", "CONFIRMED"] },
          id: { not: id },
        },
        _sum: { partySize: true },
      })

      const otherOccupancy = dayReservations._sum.partySize ?? 0
      if (otherOccupancy + targetSize > restaurant.maxCapacity) {
        return NextResponse.json(
          { error: `Capacidad máxima del día alcanzada (${restaurant.maxCapacity} personas)` },
          { status: 400 }
        )
      }
    }
    if (status !== undefined) {
      const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 })
      }
      data.status = status
    }

    // findFirst above already verified tenant ownership
    const reservation = await prisma.reservation.update({
      where: { id },
      data,
    })

    return NextResponse.json(reservation)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      )
    }

    // findFirst above already verified tenant ownership
    await prisma.reservation.delete({ where: { id } })

    return NextResponse.json({ success: true })
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
