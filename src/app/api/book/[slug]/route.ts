import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAvailability } from "@/lib/availability"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { z } from "zod"

const bookingSchema = z.object({
  customerName: z.string().min(1, "Nombre es requerido").max(200).transform((s) => s.trim()),
  customerPhone: z.string().min(1, "Teléfono es requerido").max(30).transform((s) => s.trim()),
  customerEmail: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  dateTime: z.string().min(1, "Fecha/hora es requerida").max(50),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 persona"),
})

// GET — fetch restaurant info + available time slots for a date
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationRead, request)
    if (blocked) return blocked

    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        maxCapacity: true,
        maxPartySize: true,
        operatingHours: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }

    // If a date is requested, generate available time slots
    let timeSlots: string[] = []
    if (date) {
      const operatingHours = restaurant.operatingHours as Record<string, { open: string; close: string }> | null
      if (operatingHours) {
        const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
        const requestedDate = new Date(`${date}T12:00:00`)
        const dayName = dayNames[requestedDate.getDay()]
        const dayHours = operatingHours[dayName]

        if (dayHours) {
          const { open, close } = dayHours
          const [openH, openM] = open.split(":").map(Number)
          const [closeH, closeM] = close.split(":").map(Number)

          // Generate 30-minute slots
          const slots: string[] = []
          let h = openH
          let m = openM
          while (h < closeH || (h === closeH && m < closeM)) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
            m += 30
            if (m >= 60) { h++; m = 0 }
          }

          // Filter out past times if date is today
          const now = new Date()
          const tz = restaurant.timezone || "America/Argentina/Buenos_Aires"
          const nowLocal = new Date(now.toLocaleString("en-US", { timeZone: tz }))
          const todayStr = nowLocal.toISOString().split("T")[0]

          if (date === todayStr) {
            const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes()
            timeSlots = slots.filter((slot) => {
              const [sh, sm] = slot.split(":").map(Number)
              return sh * 60 + sm > currentMinutes + 30 // At least 30 min from now
            })
          } else {
            timeSlots = slots
          }
        }
      }
    }

    return NextResponse.json({
      restaurant: {
        name: restaurant.name,
        slug: restaurant.slug,
        maxPartySize: restaurant.maxPartySize,
      },
      timeSlots,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (error) {
    console.error("Book GET error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST — create a public reservation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

    const { slug } = await params
    const body = await request.json()

    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json({ error: firstIssue?.message || "Datos inválidos" }, { status: 400 })
    }

    const { customerName, customerPhone, customerEmail, dateTime, partySize } = parsed.data

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
    })

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }

    const parsedDate = new Date(dateTime)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Fecha/hora inválida" }, { status: 400 })
    }

    // Check availability
    const availability = await checkAvailability({
      restaurantId: restaurant.id,
      dateTime: parsedDate,
      partySize,
      maxPartySize: restaurant.maxPartySize,
      maxCapacity: restaurant.maxCapacity,
      operatingHours: restaurant.operatingHours as Record<string, { open: string; close: string }> | null,
      timezone: restaurant.timezone,
    })

    if (!availability.available) {
      return NextResponse.json(
        {
          error: availability.reason || "No hay disponibilidad",
          waitlistAvailable: true,
          restaurantId: restaurant.id,
        },
        { status: 409 }
      )
    }

    // Determine if a deposit is required for this reservation
    const requiresDeposit =
      restaurant.depositEnabled &&
      Number(restaurant.depositAmount) > 0 &&
      partySize >= restaurant.depositMinPartySize

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        dateTime: parsedDate,
        partySize,
        source: "MANUAL",
        status: requiresDeposit ? "PENDING_DEPOSIT" : "PENDING",
        depositStatus: requiresDeposit ? "PENDING" : "NONE",
        depositAmount: requiresDeposit ? restaurant.depositAmount : null,
      },
    })

    return NextResponse.json({
      success: true,
      requiresDeposit,
      reservation: {
        id: reservation.id,
        dateTime: reservation.dateTime,
        partySize: reservation.partySize,
        status: reservation.status,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Book POST error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
