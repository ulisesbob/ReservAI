/**
 * Reservation status state machine.
 *
 * Valid transitions:
 *   PENDING          → CONFIRMED | CANCELLED | PENDING_DEPOSIT
 *   PENDING_DEPOSIT  → PENDING (payment received) | CANCELLED
 *   CONFIRMED        → COMPLETED | NO_SHOW | CANCELLED
 *   COMPLETED        → (terminal)
 *   NO_SHOW          → (terminal)
 *   CANCELLED        → (terminal)
 *
 * PENDING_DEPOSIT is set by the payment system only — PATCH requests
 * must never set this status directly from client input.
 */

import type { ReservationStatus } from "@prisma/client"

const TRANSITIONS: Record<ReservationStatus, ReadonlyArray<ReservationStatus>> = {
  PENDING: ["CONFIRMED", "CANCELLED", "PENDING_DEPOSIT"],
  PENDING_DEPOSIT: ["PENDING", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
}

/**
 * Returns true when moving from `from` → `to` is a valid state transition.
 */
export function isValidTransition(
  from: ReservationStatus,
  to: ReservationStatus
): boolean {
  return (TRANSITIONS[from] as ReadonlyArray<string>).includes(to)
}

/**
 * Throws a descriptive error when the transition is invalid.
 * Use this inside API handlers to get an actionable 400 message.
 */
export function validateTransition(
  from: ReservationStatus,
  to: ReservationStatus
): void {
  if (!isValidTransition(from, to)) {
    const allowed = TRANSITIONS[from]
    const allowedList = allowed.length > 0 ? allowed.join(", ") : "ninguno (estado terminal)"
    throw new Error(
      `Transición de estado inválida: ${from} → ${to}. ` +
      `Transiciones permitidas desde ${from}: ${allowedList}.`
    )
  }
}
