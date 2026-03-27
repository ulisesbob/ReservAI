import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

/** Escape CSV value to prevent formula injection (CWE-1236) */
function escapeCsv(value: string): string {
  // Always wrap in double quotes for safety, escape internal quotes
  const escaped = value.replace(/"/g, '""')
  // Prefix formula-triggering characters with tab inside quotes
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"\t${escaped}"`
  }
  return `"${escaped}"`
}

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.export, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (date) {
      const testDate = new Date(`${date}T00:00:00.000Z`)
      if (isNaN(testDate.getTime())) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 })
      }

      // Use restaurant timezone for correct day boundaries
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: session.restaurantId },
        select: { timezone: true },
      })
      const tz = restaurant?.timezone || "America/Argentina/Buenos_Aires"
      const sample = new Date(`${date}T12:00:00Z`)
      const localStr = sample.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })
      const localHour = parseInt(localStr, 10)
      const offsetHours = 12 - localHour

      const dayStart = new Date(`${date}T00:00:00.000Z`)
      dayStart.setUTCHours(-offsetHours, 0, 0, 0)
      const dayEnd = new Date(`${date}T00:00:00.000Z`)
      dayEnd.setUTCHours(23 - offsetHours, 59, 59, 999)

      where.dateTime = { gte: dayStart, lte: dayEnd }
    }

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
    if (status && status !== "ALL") {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
      }
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { dateTime: "asc" },
      take: 5000, // Safety limit
    })

    const header = "Fecha,Hora,Nombre,Telefono,Email,Personas,Estado,Origen"
    const rows = reservations.map((r) => {
      const dt = new Date(r.dateTime)
      return [
        dt.toLocaleDateString("es-AR"),
        dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        escapeCsv(r.customerName),
        escapeCsv(r.customerPhone),
        escapeCsv(r.customerEmail || ""),
        String(r.partySize),
        r.status,
        r.source,
      ].join(",")
    })

    const csv = "\uFEFF" + [header, ...rows].join("\n")
    const safeDateStr = (date || "todas").replace(/[^a-zA-Z0-9-]/g, "")
    const filename = `reservas-${safeDateStr}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
