import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { reservationUpdateSchema, parseBody } from "@/lib/schemas"
import { notifyNextInWaitlist } from "@/lib/waitlist"
import { validateTransition } from "@/lib/status-transitions"
import type { ReservationStatus } from "@prisma/client"
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

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

    const parsed = parseBody(reservationUpdateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { customerName, customerPhone, customerEmail, dateTime, partySize, status } = parsed.data
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
      if (restaurant && partySize > restaurant.maxPartySize) {
        return NextResponse.json(
          { error: `El máximo de personas por reserva es ${restaurant.maxPartySize}` },
          { status: 400 }
        )
      }
      data.partySize = partySize
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
      // PENDING_DEPOSIT is set by the payment system only — reject client attempts.
      if (status === "PENDING_DEPOSIT") {
        return NextResponse.json(
          { error: "El estado PENDING_DEPOSIT solo puede ser asignado por el sistema de pagos." },
          { status: 400 }
        )
      }
      try {
        validateTransition(existing.status as ReservationStatus, status as ReservationStatus)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Transición de estado inválida." },
          { status: 400 }
        )
      }
      data.status = status
    }

    // findFirst above already verified tenant ownership
    const reservation = await prisma.reservation.update({
      where: { id },
      data,
    })

    // Trigger waitlist notification when reservation is cancelled
    if (status === "CANCELLED" && existing.status !== "CANCELLED") {
      notifyNextInWaitlist(
        session.restaurantId,
        existing.dateTime,
        existing.partySize
      ).catch((err) => console.error("Waitlist notification error:", err))
    }

    // Fire-and-forget: sync to Google Calendar (does not block the response)
    void (async () => {
      try {
        const rest = await prisma.restaurant.findUnique({
          where: { id: session.restaurantId },
          select: {
            name: true,
            timezone: true,
            googleCalendarToken: true,
            googleCalendarId: true,
            googleCalendarEnabled: true,
          },
        })
        if (!rest) return
        if (reservation.status === "CANCELLED") {
          await deleteCalendarEvent(reservation, rest)
        } else {
          await updateCalendarEvent(reservation, rest)
        }
      } catch (err) {
        console.error("[GoogleCalendar] calendar sync error (PATCH):", err)
      }
    })()

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

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
