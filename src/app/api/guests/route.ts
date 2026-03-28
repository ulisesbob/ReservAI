/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { guestCreateSchema, parseBody } from "@/lib/schemas"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.guestRead, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim() } },
      ]
    }

    const [guests, total] = await Promise.all([
      // @ts-expect-error — Guest model pending Prisma migration
      prisma.guest.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          vipStatus: true,
          totalVisits: true,
          totalNoShows: true,
          lastVisit: true,
          createdAt: true,
        },
      }),
      // @ts-expect-error — Guest model pending Prisma migration
      prisma.guest.count({ where }),
    ])

    return NextResponse.json({
      data: guests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.guestWrite, request)
    if (blocked) return blocked

    const session = await requireSession()
    const body = await request.json()

    const parsed = parseBody(guestCreateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { name, phone, email, notes, allergies, preferences, birthday, vipStatus } = parsed.data

    // Check duplicate phone within this restaurant
    // @ts-expect-error — Guest model pending Prisma migration
    const existing = await prisma.guest.findUnique({
      where: { restaurantId_phone: { restaurantId: session.restaurantId, phone } },
    })
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cliente con ese teléfono" }, { status: 409 })
    }

    // @ts-expect-error — Guest model pending Prisma migration
    const guest = await prisma.guest.create({
      data: {
        restaurantId: session.restaurantId,
        name,
        phone,
        email: email || null,
        notes: notes || null,
        allergies: allergies || null,
        preferences: preferences || null,
        birthday: birthday ? new Date(birthday) : null,
        vipStatus: vipStatus ?? false,
      },
    })

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
