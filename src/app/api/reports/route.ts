import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStatus = any

function getDateRange(from: string | null, to: string | null): { gte: Date; lte: Date } {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const gte = from ? new Date(`${from}T00:00:00.000Z`) : firstOfMonth
  const lte = to ? new Date(`${to}T23:59:59.999Z`) : lastOfMonth

  return { gte, lte }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))]
  return lines.join("\n")
}

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.export, request)
    if (blocked) return blocked

    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)

    const type = searchParams.get("type") || "reservations"
    const format = searchParams.get("format") === "csv" ? "csv" : "json"
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const validTypes = ["reservations", "revenue", "guests", "noShows"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 })
    }

    const dateRange = getDateRange(from, to)

    if (type === "reservations") {
      const reservations = await prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          dateTime: dateRange,
        },
        orderBy: { dateTime: "asc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          dateTime: true,
          partySize: true,
          status: true,
          source: true,
          createdAt: true,
        },
      })

      if (format === "csv") {
        const rows = reservations.map((r) => ({
          "ID": r.id,
          "Cliente": r.customerName,
          "Telefono": r.customerPhone,
          "Email": r.customerEmail ?? "",
          "Fecha y Hora": new Date(r.dateTime).toLocaleString("es-AR"),
          "Personas": r.partySize,
          "Estado": r.status,
          "Origen": r.source,
          "Creado": new Date(r.createdAt).toLocaleString("es-AR"),
        }))
        const csv = toCsv(rows)
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="reservas_${from ?? "inicio"}_${to ?? "fin"}.csv"`,
          },
        })
      }

      return NextResponse.json({ data: reservations })
    }

    if (type === "revenue") {
      const payments = await prisma.payment.findMany({
        where: {
          status: "APPROVED",
          paidAt: dateRange,
          subscription: { restaurantId: session.restaurantId },
        },
        orderBy: { paidAt: "asc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
      })

      if (format === "csv") {
        const rows = payments.map((p) => ({
          "ID": p.id,
          "Monto": p.amount.toString(),
          "Moneda": p.currency,
          "Estado": p.status,
          "Pagado en": p.paidAt ? new Date(p.paidAt).toLocaleString("es-AR") : "",
          "Creado": new Date(p.createdAt).toLocaleString("es-AR"),
        }))
        const csv = toCsv(rows)
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="ingresos_${from ?? "inicio"}_${to ?? "fin"}.csv"`,
          },
        })
      }

      return NextResponse.json({ data: payments })
    }

    if (type === "guests") {
      // Unique customers who made reservations in the date range
      const rawGuests = await prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          dateTime: dateRange,
        },
        orderBy: { dateTime: "asc" },
        select: {
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          partySize: true,
          status: true,
          dateTime: true,
        },
      })

      // Deduplicate by phone, keeping last visit
      const guestMap = new Map<string, {
        nombre: string
        telefono: string
        email: string
        visitas: number
        "ultima_visita": string
      }>()
      for (const r of rawGuests) {
        const existing = guestMap.get(r.customerPhone)
        if (!existing) {
          guestMap.set(r.customerPhone, {
            nombre: r.customerName,
            telefono: r.customerPhone,
            email: r.customerEmail ?? "",
            visitas: 1,
            "ultima_visita": new Date(r.dateTime).toLocaleString("es-AR"),
          })
        } else {
          existing.visitas++
          existing["ultima_visita"] = new Date(r.dateTime).toLocaleString("es-AR")
        }
      }
      const guestRows = Array.from(guestMap.values())

      if (format === "csv") {
        const rows = guestRows.map((g) => ({
          "Nombre": g.nombre,
          "Telefono": g.telefono,
          "Email": g.email,
          "Visitas en periodo": g.visitas,
          "Ultima visita": g["ultima_visita"],
        }))
        const csv = toCsv(rows)
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="clientes_${from ?? "inicio"}_${to ?? "fin"}.csv"`,
          },
        })
      }

      return NextResponse.json({ data: guestRows })
    }

    if (type === "noShows") {
      const noShows = await prisma.reservation.findMany({
        where: {
          restaurantId: session.restaurantId,
          status: "NO_SHOW" as AnyStatus,
          dateTime: dateRange,
        },
        orderBy: { dateTime: "desc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          dateTime: true,
          partySize: true,
          createdAt: true,
        },
      })

      if (format === "csv") {
        const rows = noShows.map((r) => ({
          "ID": r.id,
          "Cliente": r.customerName,
          "Telefono": r.customerPhone,
          "Email": r.customerEmail ?? "",
          "Fecha y Hora": new Date(r.dateTime).toLocaleString("es-AR"),
          "Personas": r.partySize,
          "Creado": new Date(r.createdAt).toLocaleString("es-AR"),
        }))
        const csv = toCsv(rows)
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="no_shows_${from ?? "inicio"}_${to ?? "fin"}.csv"`,
          },
        })
      }

      return NextResponse.json({ data: noShows })
    }

    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
