import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { escalationSettingsSchema, parseBody } from "@/lib/schemas"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelect = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUpdate = any

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { id: session.restaurantId },
      select: { escalationPhone: true } as AnySelect,
    })

    return NextResponse.json({ escalationPhone: (restaurant as AnySelect).escalationPhone ?? null })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 })
      }
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const body = await request.json()
    const parsed = parseBody(escalationSettingsSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { escalationPhone } = parsed.data

    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: { escalationPhone: escalationPhone || null } as AnyUpdate,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 })
      }
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
