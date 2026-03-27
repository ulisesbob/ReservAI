import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// Notification type constants
// ---------------------------------------------------------------------------
export const NOTIFICATION_TYPES = {
  RESERVATION_NEW: "RESERVATION_NEW",
  RESERVATION_CANCEL: "RESERVATION_CANCEL",
  NO_SHOW: "NO_SHOW",
  WAITLIST_FREED: "WAITLIST_FREED",
  DEPOSIT_PAID: "DEPOSIT_PAID",
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------
export interface NotificationMetadata {
  reservationId?: string
  customerName?: string
  customerPhone?: string
  partySize?: number
  dateTime?: string
  waitlistEntryId?: string
  amount?: string
}

export interface CreateNotificationInput {
  restaurantId: string
  type: NotificationType
  title: string
  message: string
  metadata?: NotificationMetadata
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

/**
 * Persists a notification to the database.
 * Never throws — returns null on failure so callers can fire-and-forget.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ id: string } | null> {
  try {
    const notification = await prisma.notification.create({
      data: {
        restaurantId: input.restaurantId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata ?? null,
      },
      select: { id: true },
    })
    return notification
  } catch (err) {
    console.error("[notifications] createNotification failed:", err)
    return null
  }
}

/**
 * Returns count of unread notifications for a restaurant.
 */
export async function getUnreadCount(restaurantId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { restaurantId, read: false },
    })
  } catch {
    return 0
  }
}

/**
 * Marks a single notification as read, verifying ownership.
 */
export async function markAsRead(
  notificationId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, restaurantId },
      data: { read: true },
    })
    return result.count > 0
  } catch {
    return false
  }
}

/**
 * Marks all notifications for a restaurant as read.
 */
export async function markAllAsRead(restaurantId: string): Promise<number> {
  try {
    const result = await prisma.notification.updateMany({
      where: { restaurantId, read: false },
      data: { read: true },
    })
    return result.count
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Helper functions — domain-specific notification creators
// All are fire-and-forget: they return void and swallow errors.
// ---------------------------------------------------------------------------

interface ReservationLike {
  id: string
  restaurantId: string
  customerName: string
  customerPhone: string
  partySize: number
  dateTime: Date
}

interface WaitlistEntryLike {
  id: string
  restaurantId: string
  customerName: string
  customerPhone: string
  partySize: number
  dateTime: Date
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function notifyNewReservation(reservation: ReservationLike): void {
  createNotification({
    restaurantId: reservation.restaurantId,
    type: NOTIFICATION_TYPES.RESERVATION_NEW,
    title: "Nueva reserva",
    message: `${reservation.customerName} reservó para ${reservation.partySize} personas el ${formatDateTime(reservation.dateTime)}.`,
    metadata: {
      reservationId: reservation.id,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      dateTime: reservation.dateTime.toISOString(),
    },
  }).catch((err) => console.error("[notifications] notifyNewReservation:", err))
}

export function notifyCancel(reservation: ReservationLike): void {
  createNotification({
    restaurantId: reservation.restaurantId,
    type: NOTIFICATION_TYPES.RESERVATION_CANCEL,
    title: "Reserva cancelada",
    message: `${reservation.customerName} canceló su reserva para ${reservation.partySize} personas del ${formatDateTime(reservation.dateTime)}.`,
    metadata: {
      reservationId: reservation.id,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      dateTime: reservation.dateTime.toISOString(),
    },
  }).catch((err) => console.error("[notifications] notifyCancel:", err))
}

export function notifyNoShow(reservation: ReservationLike): void {
  createNotification({
    restaurantId: reservation.restaurantId,
    type: NOTIFICATION_TYPES.NO_SHOW,
    title: "No-show registrado",
    message: `${reservation.customerName} no se presentó a su reserva del ${formatDateTime(reservation.dateTime)} (${reservation.partySize} personas).`,
    metadata: {
      reservationId: reservation.id,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      dateTime: reservation.dateTime.toISOString(),
    },
  }).catch((err) => console.error("[notifications] notifyNoShow:", err))
}

export function notifyDepositPaid(
  reservation: ReservationLike & { depositAmount?: string | number | null }
): void {
  const amount = reservation.depositAmount
    ? `$${Number(reservation.depositAmount).toLocaleString("es-AR")} ARS`
    : ""
  createNotification({
    restaurantId: reservation.restaurantId,
    type: NOTIFICATION_TYPES.DEPOSIT_PAID,
    title: "Sena recibida",
    message: `${reservation.customerName} pagó la sena${amount ? ` de ${amount}` : ""} para su reserva del ${formatDateTime(reservation.dateTime)}.`,
    metadata: {
      reservationId: reservation.id,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      dateTime: reservation.dateTime.toISOString(),
      amount: amount || undefined,
    },
  }).catch((err) => console.error("[notifications] notifyDepositPaid:", err))
}

export function notifyWaitlistFreed(entry: WaitlistEntryLike): void {
  createNotification({
    restaurantId: entry.restaurantId,
    type: NOTIFICATION_TYPES.WAITLIST_FREED,
    title: "Lugar liberado en lista de espera",
    message: `Se notificó a ${entry.customerName} sobre un lugar disponible el ${formatDateTime(entry.dateTime)} (${entry.partySize} personas).`,
    metadata: {
      waitlistEntryId: entry.id,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      partySize: entry.partySize,
      dateTime: entry.dateTime.toISOString(),
    },
  }).catch((err) => console.error("[notifications] notifyWaitlistFreed:", err))
}
