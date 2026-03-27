import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"
import { notifyWaitlistFreed } from "@/lib/notifications"

/**
 * Find the next WAITING entry for a given restaurant/time window and notify them.
 * Called when a reservation is cancelled to offer the spot to the next person.
 */
export async function notifyNextInWaitlist(
  restaurantId: string,
  dateTime: Date,
  freedCapacity: number
): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      whatsappPhoneId: true,
      whatsappToken: true,
      timezone: true,
    },
  })

  if (!restaurant?.whatsappPhoneId || !restaurant?.whatsappToken) return

  const windowStart = new Date(dateTime.getTime() - 60 * 60 * 1000)
  const windowEnd = new Date(dateTime.getTime() + 60 * 60 * 1000)

  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: {
      restaurantId,
      status: "WAITING",
      dateTime: { gte: windowStart, lte: windowEnd },
      partySize: { lte: freedCapacity },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!nextEntry) return

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.waitlistEntry.update({
    where: { id: nextEntry.id },
    data: {
      status: "NOTIFIED",
      notifiedAt: new Date(),
      expiresAt,
    },
  })

  // Fire-and-forget: notify owner that a waitlist spot was freed and customer was notified
  notifyWaitlistFreed({
    ...nextEntry,
    restaurantId,
  })

  const dateStr = dateTime.toLocaleDateString("es-AR", {
    timeZone: restaurant.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const timeStr = dateTime.toLocaleTimeString("es-AR", {
    timeZone: restaurant.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const message =
    `¡Se liberó un lugar en ${restaurant.name}!\n\n` +
    `${dateStr} a las ${timeStr}\n` +
    `${nextEntry.partySize} personas\n\n` +
    `¿Querés confirmar tu reserva? Tenés 15 minutos para responder.\n` +
    `Respondé SÍ para confirmar o NO para cancelar.`

  const decryptedToken = safeDecrypt(restaurant.whatsappToken)
  await sendWhatsAppMessage(
    restaurant.whatsappPhoneId,
    decryptedToken,
    nextEntry.customerPhone,
    message
  )
}

/**
 * Expire NOTIFIED waitlist entries that have passed their 15-minute window.
 * Then notify the next person in line.
 */
export async function expireAndNotifyNext(restaurantId: string): Promise<void> {
  const expired = await prisma.waitlistEntry.findMany({
    where: {
      restaurantId,
      status: "NOTIFIED",
      expiresAt: { lt: new Date() },
    },
  })

  for (const entry of expired) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "EXPIRED" },
    })

    await notifyNextInWaitlist(restaurantId, entry.dateTime, entry.partySize)
  }
}

/**
 * Confirm a waitlist entry — create the reservation and mark as CONFIRMED.
 */
export async function confirmWaitlistEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry) return { success: false, error: "Entrada no encontrada" }
  if (entry.status !== "NOTIFIED") return { success: false, error: "No está en estado de confirmación" }
  if (entry.expiresAt && entry.expiresAt < new Date()) {
    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: "EXPIRED" },
    })
    return { success: false, error: "El tiempo para confirmar expiró" }
  }

  await prisma.$transaction([
    prisma.reservation.create({
      data: {
        restaurantId: entry.restaurantId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        customerEmail: entry.customerEmail,
        dateTime: entry.dateTime,
        partySize: entry.partySize,
        status: "CONFIRMED",
        source: "WHATSAPP",
      },
    }),
    prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: "CONFIRMED" },
    }),
  ])

  return { success: true }
}
