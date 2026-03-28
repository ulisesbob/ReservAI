import { z } from "zod"

// ─── Reservation schemas ────────────────────────────────────────────────────

export const reservationCreateSchema = z.object({
  customerName: z.string().min(1, "Nombre es requerido").max(200, "Nombre demasiado largo"),
  customerPhone: z.string().min(1, "Teléfono es requerido").max(30, "Teléfono demasiado largo"),
  customerEmail: z.string().email("Email inválido").max(255).nullish().or(z.literal("")),
  dateTime: z.string().min(1, "Fecha/hora es requerida"),
  partySize: z.coerce.number().int("Debe ser entero").min(1, "Mínimo 1 persona"),
})

export const reservationUpdateSchema = z.object({
  customerName: z.string().min(1).max(200, "Nombre demasiado largo").optional(),
  customerPhone: z.string().min(1).max(30, "Teléfono demasiado largo").optional(),
  customerEmail: z.string().email("Email inválido").max(255).nullish(),
  dateTime: z.string().optional(),
  partySize: z.coerce.number().int("Debe ser entero").min(1, "Mínimo 1 persona").optional(),
  status: z.enum(["PENDING", "PENDING_DEPOSIT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
})

// ─── Register schema ────────────────────────────────────────────────────────

export const registerSchema = z.object({
  restaurantName: z.string().min(1, "Nombre del restaurante es requerido").max(100),
  name: z.string().min(1, "Nombre es requerido").max(100),
  email: z.string().email("Email inválido").max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128, "Contraseña demasiado larga"),
  timezone: z.string().optional(),
})

// ─── Settings schemas ───────────────────────────────────────────────────────

export const restaurantSettingsSchema = z.object({
  name: z.string().min(1, "Nombre es obligatorio").max(100).transform((s) => s.trim()),
  timezone: z.string().optional(),
  maxCapacity: z.number().int().min(1, "Capacidad debe ser mayor a 0"),
  maxPartySize: z.number().int().min(1, "Máximo por reserva debe ser mayor a 0"),
  operatingHours: z.record(z.string(), z.unknown()).nullish(),
})

export const knowledgeBaseSchema = z.object({
  knowledgeBase: z.string().max(50000, "Máximo 50.000 caracteres"),
})

export const whatsappSettingsSchema = z.object({
  whatsappPhoneId: z.string(),
  whatsappToken: z.string(),
  openaiApiKey: z.string().nullish(),
})

export const escalationSettingsSchema = z.object({
  escalationPhone: z
    .string()
    .max(30, "Teléfono demasiado largo")
    .regex(/^\+?[1-9]\d{6,14}$/, "Formato de teléfono inválido")
    .nullish()
    .or(z.literal("")),
})

export const accountUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
})

export const billingSchema = z.object({
  plan: z.enum(["MONTHLY", "YEARLY"]),
})

export const depositSettingsSchema = z.object({
  depositEnabled: z.boolean(),
  depositAmount: z.number().int().min(0, "El monto debe ser mayor o igual a 0").max(1000000, "El monto máximo es $1.000.000"),
  depositMinPartySize: z.number().int().min(1, "Minimo 1 persona"),
})

export const depositRequestSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID es requerido"),
})


// ─── Team schemas ──────────────────────────────────────────────────────────

export const teamMemberCreateSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(100, "Nombre demasiado largo").transform((s) => s.trim()),
  email: z.string().email("Email inválido").max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128, "Contraseña demasiado larga"),
})

// ─── Waitlist schemas ────────────────────────────────────────────────────────

export const waitlistCreateSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID es requerido"),
  customerName: z.string().min(1, "Nombre es requerido").max(200),
  customerPhone: z.string().min(1, "Teléfono es requerido").max(30),
  customerEmail: z.string().email("Email inválido").max(255).nullish().or(z.literal("")),
  dateTime: z.string().min(1, "Fecha/hora es requerida"),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 persona"),
})

// ─── Guest schemas ──────────────────────────────────────────────────────────

export const guestCreateSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(200, "Nombre demasiado largo").transform((s) => s.trim()),
  phone: z.string().min(1, "Teléfono es requerido").max(30, "Teléfono demasiado largo"),
  email: z.string().email("Email inválido").max(255).nullish().or(z.literal("")),
  notes: z.string().max(5000).nullish(),
  allergies: z.string().max(2000).nullish(),
  preferences: z.string().max(2000).nullish(),
  birthday: z.string().nullish(),
  vipStatus: z.boolean().optional(),
})

export const guestUpdateSchema = guestCreateSchema.partial().omit({ phone: true })

// ─── Review schemas ─────────────────────────────────────────────────────────

export const reviewCreateSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID es requerido"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(5000).nullish(),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a Zod schema and return a formatted error response or the parsed data */
export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues
    const firstIssue = issues[0]
    return { success: false, error: firstIssue?.message || "Datos inválidos" }
  }
  return { success: true, data: result.data }
}
