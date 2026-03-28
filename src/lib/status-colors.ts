/**
 * Shared reservation status colors and labels.
 * Used across calendar, list, and day views for consistent styling.
 */

type StatusStyle = {
  dot: string
  badge: string
  bg: string
  border: string
  text: string
}

const STATUS_MAP: Record<string, StatusStyle> = {
  PENDING: {
    dot: "bg-yellow-400",
    badge: "border-yellow-500 text-yellow-700 bg-yellow-50",
    bg: "bg-yellow-100",
    border: "border-l-yellow-400",
    text: "text-yellow-800",
  },
  PENDING_DEPOSIT: {
    dot: "bg-amber-400",
    badge: "border-amber-500 text-amber-700 bg-amber-50",
    bg: "bg-amber-100",
    border: "border-l-amber-400",
    text: "text-amber-800",
  },
  CONFIRMED: {
    dot: "bg-emerald-500",
    badge: "border-transparent bg-emerald-100 text-emerald-800",
    bg: "bg-emerald-100",
    border: "border-l-emerald-500",
    text: "text-emerald-800",
  },
  CANCELLED: {
    dot: "bg-red-400",
    badge: "border-transparent bg-red-100 text-red-800",
    bg: "bg-red-100",
    border: "border-l-red-400",
    text: "text-red-700",
  },
  COMPLETED: {
    dot: "bg-gray-400",
    badge: "border-transparent bg-gray-100 text-gray-700",
    bg: "bg-gray-100",
    border: "border-l-gray-400",
    text: "text-gray-600",
  },
  NO_SHOW: {
    dot: "bg-orange-400",
    badge: "border-transparent bg-orange-100 text-orange-800",
    bg: "bg-orange-100",
    border: "border-l-orange-400",
    text: "text-orange-800",
  },
}

const FALLBACK: StatusStyle = STATUS_MAP.COMPLETED

const LABEL_MAP: Record<string, string> = {
  PENDING: "Pendiente",
  PENDING_DEPOSIT: "Esperando sena",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistio",
}

export function getStatusColors(status: string): StatusStyle {
  return STATUS_MAP[status] ?? FALLBACK
}

export function getStatusLabel(status: string): string {
  return LABEL_MAP[status] ?? status
}
