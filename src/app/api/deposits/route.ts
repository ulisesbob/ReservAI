import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createDepositPreference } from "@/lib/mercadopago"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { z } from "zod"

const depositRequestSchema = z.object({
  reservationId: z.string().min(1),
  payerEmail: z.string().email().optional(),
})

/**
 * POST /api/deposits
 * Creates a MercadoPago Preference for a deposit payment on a reservation
 * that is in PENDING_DEPOSIT status.
 */
export async function POST(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

    const body = await request.json()
    const parsed = depositRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 })
    }

    const { reservationId, payerEmail } = parsed.data

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { restaurant: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    if (reservation.status !== "PENDING_DEPOSIT") {
      return NextResponse.json(
        { error: "Esta reserva no requiere sena o ya fue pagada" },
        { status: 400 },
      )
    }

    if (!reservation.depositAmount || reservation.depositAmount <= 0) {
      return NextResponse.json({ error: "Monto de sena invalido" }, { status: 400 })
    }

    // FIX 3: Never use the client-controlled Origin header to construct the
    // notificationUrl — an attacker could redirect MercadoPago callbacks to an
    // arbitrary server. NEXT_PUBLIC_APP_URL must be set in the environment.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      console.error("[Deposits] NEXT_PUBLIC_APP_URL is not configured")
      return NextResponse.json({ error: "Error de configuracion del servidor" }, { status: 500 })
    }
    const backUrl = `${baseUrl}/book/${reservation.restaurant.slug}`
    const notificationUrl = `${baseUrl}/api/webhooks/deposits`

    // FIX 4: Idempotency check — if a preference already exists for this
    // reservation, return the existing init_point instead of creating a new one.
    // This prevents duplicate charges when the client retries the request.
    if (reservation.mercadoPagoDepositId) {
      console.log("[Deposits] Returning existing preference for reservation:", reservation.id)
      // We don't store init_point so we reconstruct the MP checkout URL from the id.
      const existingInitPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=${reservation.mercadoPagoDepositId}`
      return NextResponse.json({
        initPoint: existingInitPoint,
        preferenceId: reservation.mercadoPagoDepositId,
      })
    }

    const preference = await createDepositPreference({
      reservationId: reservation.id,
      restaurantName: reservation.restaurant.name,
      amount: reservation.depositAmount,
      payerEmail,
      backUrl,
      notificationUrl,
    })

    // Store the preference ID on the reservation for later reconciliation
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { mercadoPagoDepositId: preference.id ?? undefined },
    })

    return NextResponse.json({
      initPoint: preference.init_point,
      preferenceId: preference.id,
    })
  } catch (error) {
    console.error("[Deposits] Error creating preference:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
