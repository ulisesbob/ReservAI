/**
 * Validates password strength.
 * Returns null if valid, or an error message string.
 */
export function validatePassword(password: string): string | null {
  if (typeof password !== "string") return "La contraseña es inválida"
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres"
  if (password.length > 128) return "La contraseña es demasiado larga"
  if (!/[a-z]/.test(password)) return "La contraseña debe incluir al menos una letra minúscula"
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir al menos una letra mayúscula"
  if (!/[0-9]/.test(password)) return "La contraseña debe incluir al menos un número"
  return null
}

/** Valid reservation status values */
export const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const
