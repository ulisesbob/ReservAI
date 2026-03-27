import crypto from "crypto"
import { MercadoPagoConfig, PreApproval, Preference } from "mercadopago"

// Factory function — never cache the client as a module-level singleton.
// In Next.js serverless/edge and during hot reload the module can persist while
// env vars are updated, causing stale or missing tokens to remain in memory.
// Creating a new MercadoPagoConfig per call is cheap (no I/O) and ensures the
// current token value from process.env is always used.
function createClient(): MercadoPagoConfig {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured")
  }
  return new MercadoPagoConfig({ accessToken: token })
}

export const PLANS = {
  MONTHLY: {
    reason: "ReservasAI - Plan Mensual",
    amount: 25000,
    frequency: 1,
    frequencyType: "months" as const,
  },
  YEARLY: {
    reason: "ReservasAI - Plan Anual",
    amount: 240000,
    frequency: 12,
    frequencyType: "months" as const,
  },
} as const

export async function createSubscription(
  plan: "MONTHLY" | "YEARLY",
  payerEmail: string,
  backUrl: string,
) {
  const planConfig = PLANS[plan]
  const client = createClient()
  const preapproval = new PreApproval(client)

  const result = await preapproval.create({
    body: {
      reason: planConfig.reason,
      auto_recurring: {
        frequency: planConfig.frequency,
        frequency_type: planConfig.frequencyType,
        transaction_amount: planConfig.amount,
        currency_id: "ARS",
      },
      payer_email: payerEmail,
      back_url: backUrl,
      status: "pending",
    },
  })

  return result
}

/**
 * Verify the MercadoPago webhook signature according to the official spec:
 * https://www.mercadopago.com.ar/developers/en/docs/notifications/webhooks/signature-validation
 *
 * The x-signature header format is: "ts=<timestamp>,v1=<hmac-sha256-hex>"
 * The manifest to sign is: "id:<dataId>;request-id:<xRequestId>;ts:<ts>;"
 *
 * Returns false (and logs a warning) on any validation failure so the webhook
 * handler can respond with 401. Never throws — a thrown error here would cause
 * the webhook to return 500 which triggers unnecessary MP retries.
 */
export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
): boolean {
  if (!xSignature || !xRequestId) {
    console.warn("[MP webhook] Missing x-signature or x-request-id header")
    return false
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    console.warn("[MP webhook] MERCADOPAGO_WEBHOOK_SECRET is not configured")
    return false
  }

  const parts = xSignature.split(",")
  const tsRaw = parts.find((p) => p.trim().startsWith("ts="))
  const hashRaw = parts.find((p) => p.trim().startsWith("v1="))

  if (!tsRaw || !hashRaw) {
    console.warn("[MP webhook] x-signature header missing ts= or v1= parts:", xSignature)
    return false
  }

  const ts = tsRaw.trim().slice(3)    // everything after "ts="
  const hash = hashRaw.trim().slice(3) // everything after "v1="

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  try {
    // timingSafeEqual requires equal-length buffers; if the incoming hash is not
    // valid hex or has a different byte length, Buffer.from will still produce a
    // buffer but of wrong length, causing the equal() call to throw — we catch
    // that and return false rather than crashing the handler.
    const hashBuf = Buffer.from(hash, "hex")
    const expectedBuf = Buffer.from(expected, "hex")
    if (hashBuf.length !== expectedBuf.length) {
      console.warn("[MP webhook] Signature length mismatch")
      return false
    }
    return crypto.timingSafeEqual(hashBuf, expectedBuf)
  } catch (err) {
    console.warn("[MP webhook] Signature comparison error:", err)
    return false
  }
}

/**
 * Create a one-time MercadoPago Preference for a deposit payment.
 * Returns the Preference object with init_point for redirecting the payer.
 */
export async function createDepositPreference({
  reservationId,
  restaurantName,
  amount,
  payerEmail,
  backUrl,
  notificationUrl,
}: {
  reservationId: string
  restaurantName: string
  amount: number
  payerEmail?: string
  backUrl: string
  notificationUrl: string
}) {
  const client = createClient()
  const preference = new Preference(client)

  const result = await preference.create({
    body: {
      items: [
        {
          id: reservationId,
          title: `Sena - Reserva en ${restaurantName}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "ARS",
        },
      ],
      ...(payerEmail ? { payer: { email: payerEmail } } : {}),
      back_urls: {
        success: `${backUrl}?deposit=success`,
        failure: `${backUrl}?deposit=failure`,
        pending: `${backUrl}?deposit=pending`,
      },
      auto_return: "approved",
      external_reference: reservationId,
      notification_url: notificationUrl,
      statement_descriptor: "ReservasAI Sena",
    },
  })

  return result
}

/** Returns a fresh MercadoPagoConfig instance using the current env token. */
export function getMercadoPagoClient(): MercadoPagoConfig {
  return createClient()
}
