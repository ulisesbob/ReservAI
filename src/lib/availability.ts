import { prisma } from "@/lib/prisma"

interface OperatingHoursDay {
  open: string
  close: string
}

interface AvailabilityCheck {
  restaurantId: string
  dateTime: Date
  partySize: number
  maxPartySize: number
  maxCapacity: number
  operatingHours: Record<string, OperatingHoursDay> | null
  timezone: string
}

interface AvailabilityResult {
  available: boolean
  reason?: string
}

export type { AvailabilityCheck, AvailabilityResult }

export async function checkAvailability(
  params: AvailabilityCheck
): Promise<AvailabilityResult> {
  const {
    restaurantId,
    dateTime,
    partySize,
    maxPartySize,
    maxCapacity,
    operatingHours,
    timezone,
  } = params

  // Check party size
  if (partySize > maxPartySize) {
    return {
      available: false,
      reason: `El máximo de personas por reserva es ${maxPartySize}`,
    }
  }

  if (partySize < 1) {
    return {
      available: false,
      reason: "La cantidad de personas debe ser al menos 1",
    }
  }

  // Check if date is in the past
  if (dateTime < new Date()) {
    return {
      available: false,
      reason: "No se pueden hacer reservas en fechas pasadas",
    }
  }

  // Check operating hours
  if (operatingHours) {
    // Keys must match exactly what onboarding/settings saves to the DB (no accents)
    const dayKeys = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ]
    // Display names for error messages (accented, plural-friendly)
    const dayDisplayNames = [
      "domingos",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábados",
    ]

    // Get the day of week in the restaurant's timezone
    const dateInTz = new Date(
      dateTime.toLocaleString("en-US", { timeZone: timezone })
    )
    const dayIndex = dateInTz.getDay()
    const dayKey = dayKeys[dayIndex]
    const hours = operatingHours[dayKey]

    if (!hours || !hours.open || !hours.close) {
      return {
        available: false,
        reason: `El restaurante no abre los ${dayDisplayNames[dayIndex]}`,
      }
    }

    const timeStr = dateTime.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })

    if (timeStr < hours.open || timeStr >= hours.close) {
      return {
        available: false,
        reason: `El horario de atención es de ${hours.open} a ${hours.close}`,
      }
    }
  }

  // Check capacity — count confirmed reservations in a 2-hour window
  const windowStart = new Date(dateTime.getTime() - 60 * 60 * 1000) // 1 hour before
  const windowEnd = new Date(dateTime.getTime() + 60 * 60 * 1000) // 1 hour after

  const existingReservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      dateTime: { gte: windowStart, lte: windowEnd },
      status: { in: ["PENDING", "PENDING_DEPOSIT", "CONFIRMED"] },
    },
    select: { partySize: true },
  })

  const totalGuests = existingReservations.reduce(
    (sum, r) => sum + r.partySize,
    0
  )

  if (totalGuests + partySize > maxCapacity) {
    return {
      available: false,
      reason: `No hay capacidad disponible para ese horario. Capacidad máxima: ${maxCapacity}`,
    }
  }

  return { available: true }
}
