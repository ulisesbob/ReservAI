import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isValidTimezone } from "@/lib/validation"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const blocked = applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { id: session.restaurantId },
      select: {
        name: true,
        slug: true,
        timezone: true,
        maxCapacity: true,
        maxPartySize: true,
        operatingHours: true,
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
    const blocked = applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const body = await request.json()
    const { name, timezone, maxCapacity, maxPartySize, operatingHours } = body

    // Validations
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    if (timezone && !isValidTimezone(timezone)) {
      return NextResponse.json(
        { error: "Zona horaria inválida" },
        { status: 400 }
      )
    }

    if (typeof maxCapacity !== "number" || maxCapacity <= 0) {
      return NextResponse.json(
        { error: "La capacidad maxima debe ser mayor a 0" },
        { status: 400 }
      )
    }

    if (typeof maxPartySize !== "number" || maxPartySize <= 0) {
      return NextResponse.json(
        { error: "El maximo por reserva debe ser mayor a 0" },
        { status: 400 }
      )
    }

    if (maxPartySize > maxCapacity) {
      return NextResponse.json(
        { error: "El maximo por reserva no puede superar la capacidad maxima" },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        name: name.trim(),
        timezone,
        maxCapacity,
        maxPartySize,
        operatingHours: operatingHours ?? undefined,
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
