import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { guestUpdateSchema, parseBody } from "@/lib/schemas"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.guestRead, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { id } = await params

    const guest = await prisma.guest.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!guest) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Fetch reservation history for this guest (by phone)
    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId: session.restaurantId,
        customerPhone: guest.phone,
      },
      orderBy: { dateTime: "desc" },
      take: 50,
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        partySize: true,
        status: true,
        source: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ ...guest, reservations })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.guestWrite, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.guest.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = parseBody(guestUpdateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { name, email, notes, allergies, preferences, birthday, vipStatus } = parsed.data
    const data: Record<string, unknown> = {}

    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email || null
    if (notes !== undefined) data.notes = notes || null
    if (allergies !== undefined) data.allergies = allergies || null
    if (preferences !== undefined) data.preferences = preferences || null
    if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null
    if (vipStatus !== undefined) data.vipStatus = vipStatus

    const guest = await prisma.guest.update({ where: { id }, data })
    return NextResponse.json(guest)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.guestWrite, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.guest.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    await prisma.guest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
