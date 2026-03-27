/**
 * Shared guest upsert and stat-update helpers.
 * Used by the reservations API and the WhatsApp webhook.
 */
import { prisma } from "@/lib/prisma"

/**
 * Upsert a Guest record for a given restaurant + phone.
 * Called when a reservation is created (MANUAL or WHATSAPP).
 * Does NOT increment visit counters — those are updated on status change.
 */
export async function upsertGuest(params: {
  restaurantId: string
  name: string
  phone: string
  email?: string | null
}): Promise<void> {
  const { restaurantId, name, phone, email } = params
  try {
    await prisma.guest.upsert({
      where: { restaurantId_phone: { restaurantId, phone } },
      create: {
        restaurantId,
        name,
        phone,
        email: email || null,
      },
      update: {
        // Update name and email only if they are provided (don't overwrite manual edits with stale data)
        name,
        ...(email ? { email } : {}),
      },
    })
  } catch (err) {
    // Non-fatal — log but don't fail the reservation
    console.error("[guest-ops] upsertGuest error:", err)
  }
}

/**
 * Increment totalVisits and update lastVisit when a reservation is COMPLETED.
 */
export async function recordGuestVisit(params: {
  restaurantId: string
  phone: string
  visitedAt: Date
}): Promise<void> {
  const { restaurantId, phone, visitedAt } = params
  try {
    await prisma.guest.updateMany({
      where: { restaurantId, phone },
      data: {
        totalVisits: { increment: 1 },
        lastVisit: visitedAt,
      },
    })
  } catch (err) {
    console.error("[guest-ops] recordGuestVisit error:", err)
  }
}

/**
 * Increment totalNoShows when a reservation is marked NO_SHOW.
 */
export async function recordGuestNoShow(params: {
  restaurantId: string
  phone: string
}): Promise<void> {
  const { restaurantId, phone } = params
  try {
    await prisma.guest.updateMany({
      where: { restaurantId, phone },
      data: { totalNoShows: { increment: 1 } },
    })
  } catch (err) {
    console.error("[guest-ops] recordGuestNoShow error:", err)
  }
}
