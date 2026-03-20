import crypto from "crypto"
import { MercadoPagoConfig, PreApproval } from "mercadopago"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

const PLANS = {
  MONTHLY: {
    reason: "ReservaYa - Plan Mensual",
    amount: 25000,
    frequency: 1,
    frequencyType: "months" as const,
  },
  YEARLY: {
    reason: "ReservaYa - Plan Anual",
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

  return hash === expected
}

export { client as mercadoPagoClient, PLANS }
