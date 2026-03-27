import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { listCalendars } from "@/lib/google-calendar"

/**
 * GET /api/settings/google-calendar
 * Returns current Google Calendar config (no tokens, just status).
 * Also returns the list of calendars if connected.
 */
export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()

    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { id: session.restaurantId },
      select: {
        googleCalendarToken: true,
        googleCalendarId: true,
        googleCalendarEnabled: true,
      },
    })

    const connected = !!restaurant.googleCalendarToken
    let calendars: Array<{ id: string; summary: string; primary: boolean }> = []

    if (connected && restaurant.googleCalendarToken) {
      calendars = await listCalendars(restaurant.googleCalendarToken)
    }

    return NextResponse.json({
      connected,
      enabled: restaurant.googleCalendarEnabled,
      calendarId: restaurant.googleCalendarId,
      calendars,
    })
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

/**
 * PATCH /api/settings/google-calendar
 * Update settings: enable/disable sync, change calendar ID.
 */
export async function PATCH(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const body = await request.json()

    const updateData: { googleCalendarEnabled?: boolean; googleCalendarId?: string | null } = {}

    if (typeof body.enabled === "boolean") {
      updateData.googleCalendarEnabled = body.enabled
    }

    if (typeof body.calendarId === "string" || body.calendarId === null) {
      updateData.googleCalendarId = body.calendarId || null
    }

    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: updateData,
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

/**
 * DELETE /api/settings/google-calendar
 * Disconnect Google Calendar (removes token and disables sync).
 */
export async function DELETE(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked

    const session = await requireAdmin()

    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: {
        googleCalendarToken: null,
        googleCalendarId: null,
        googleCalendarEnabled: false,
      },
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
