import crypto from "crypto"
import { MercadoPagoConfig, PreApproval } from "mercadopago"

let _client: MercadoPagoConfig

function getClient() {
  if (!_client) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!token) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured")
    }
    _client = new MercadoPagoConfig({ accessToken: token })
  }
  return _client
}

const PLANS = {
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
}

export async function createSubscription(
  plan: "MONTHLY" | "YEARLY",
  payerEmail: string,
  backUrl: string,
) {
  const planConfig = PLANS[plan]
  const preapproval = new PreApproval(getClient())

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

export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
): boolean {
  if (!xSignature || !xRequestId) return false

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return false

  const parts = xSignature.split(",")
  const tsRaw = parts.find((p) => p.trim().startsWith("ts="))
  const hashRaw = parts.find((p) => p.trim().startsWith("v1="))

  if (!tsRaw || !hashRaw) return false

  const ts = tsRaw.split("=")[1]
  const hash = hashRaw.split("=")[1]

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"))
  } catch {
    return false
  }
}

export function getMercadoPagoClient() {
  return getClient()
}

export { PLANS }
