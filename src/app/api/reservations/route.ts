import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const date = searchParams.get("date")

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (status) {
      where.status = status
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`)
      const dayEnd = new Date(`${date}T23:59:59.999Z`)
      where.dateTime = { gte: dayStart, lte: dayEnd }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { dateTime: "asc" },
    })

    return NextResponse.json(reservations)
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

export async function POST(request: Request) {
  try {
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

    return NextResponse.json(reservation, { status: 201 })
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
