import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession()
    const { id } = params

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
    if (dateTime !== undefined) data.dateTime = new Date(dateTime)
    if (partySize !== undefined) {
      const size = Number(partySize)
      if (!Number.isInteger(size) || size < 1) {
        return NextResponse.json({ error: "partySize debe ser un entero positivo" }, { status: 400 })
      }
      data.partySize = size
    }
    if (status !== undefined) {
      const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 })
      }
      data.status = status
    }

    const reservation = await prisma.reservation.update({
      where: { id, restaurantId: session.restaurantId },
      data,
    })

    return NextResponse.json(reservation)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession()
    const { id } = params

    const existing = await prisma.reservation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      )
    }

    await prisma.reservation.delete({ where: { id, restaurantId: session.restaurantId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
