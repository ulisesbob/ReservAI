import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { depositSettingsSchema, parseBody } from "@/lib/schemas"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { id: session.restaurantId },
      select: {
        depositEnabled: true,
        depositAmount: true,
        depositMinPartySize: true,
      },
    })

    return NextResponse.json(restaurant)
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
    const parsed = parseBody(depositSettingsSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { depositEnabled, depositAmount, depositMinPartySize } = parsed.data

    if (depositEnabled && depositAmount <= 0) {
      return NextResponse.json(
        { error: "El monto de la sena debe ser mayor a 0 cuando esta habilitada" },
        { status: 400 },
      )
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        depositEnabled,
        depositAmount,
        depositMinPartySize,
      },
      select: {
        depositEnabled: true,
        depositAmount: true,
        depositMinPartySize: true,
      },
    })

    return NextResponse.json(restaurant)
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
