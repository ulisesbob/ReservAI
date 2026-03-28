import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()

    const tables = await (prisma as AnyPrisma).restaurantTable.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: [{ zone: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        capacity: true,
        zone: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: tables })
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
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const body = await request.json()

    const { name, capacity, zone } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }
    if (!capacity || typeof capacity !== "number" || capacity < 1 || capacity > 100) {
      return NextResponse.json({ error: "Capacidad inválida (1–100)" }, { status: 400 })
    }

    const table = await (prisma as AnyPrisma).restaurantTable.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        capacity,
        zone: zone?.trim() || null,
        isActive: true,
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    // Verify ownership
    const existing = await (prisma as AnyPrisma).restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const { name, capacity, zone, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (capacity !== undefined) updateData.capacity = Number(capacity)
    if (zone !== undefined) updateData.zone = zone?.trim() || null
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const table = await (prisma as AnyPrisma).restaurantTable.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(table)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    // Verify ownership
    const existing = await (prisma as AnyPrisma).restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 })
    }

    // Soft delete: set isActive = false
    await (prisma as AnyPrisma).restaurantTable.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
