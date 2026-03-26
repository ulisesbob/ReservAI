import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature, getMercadoPagoClient } from "@/lib/mercadopago"
import { PreApproval, Payment as MPPayment } from "mercadopago"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!data?.id) {
      return NextResponse.json({ error: "Missing data.id" }, { status: 400 })
    }

    const xSignature = request.headers.get("x-signature")
    const xRequestId = request.headers.get("x-request-id")

    if (!verifyWebhookSignature(xSignature, xRequestId, String(data.id))) {
      console.error("[MP webhook] Signature verification failed for notification type:", type, "data.id:", data.id)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const client = getMercadoPagoClient()

    if (type === "payment") {
      const mpPayment = new MPPayment(client)
      const paymentInfo = await mpPayment.get({ id: data.id })

      if (!paymentInfo) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      // MercadoPago includes preapproval_id at the top level for subscription
      // payments. The SDK types do not declare it, so we cast through unknown.
      const rawPayment = paymentInfo as unknown as Record<string, unknown>
      const preapprovalId =
        (rawPayment.preapproval_id as string | undefined) ??
        (paymentInfo.metadata?.preapproval_id as string | undefined)

      let subscription = preapprovalId
        ? await prisma.subscription.findUnique({
            where: { mercadoPagoSubscriptionId: preapprovalId },
          })
        : null

      // Fallback: look up by payer email when preapproval_id is absent
      if (!subscription && paymentInfo.payer?.email) {
        const user = await prisma.user.findUnique({
          where: { email: paymentInfo.payer.email },
          select: { restaurantId: true },
        })
        if (user) {
          subscription = await prisma.subscription.findUnique({
            where: { restaurantId: user.restaurantId },
          })
        }
      }

      if (subscription) {
        const paymentStatus =
          paymentInfo.status === "approved"
            ? "APPROVED"
            : paymentInfo.status === "rejected"
              ? "REJECTED"
              : "PENDING"

        await prisma.payment.upsert({
          where: { mercadoPagoPaymentId: String(data.id) },
          create: {
            subscriptionId: subscription.id,
            amount: paymentInfo.transaction_amount ?? 0,
            currency: "ARS",
            status: paymentStatus,
            mercadoPagoPaymentId: String(data.id),
            paidAt: paymentStatus === "APPROVED" ? new Date() : null,
          },
          update: {
            status: paymentStatus,
            paidAt: paymentStatus === "APPROVED" ? new Date() : null,
          },
        })

        if (paymentStatus === "APPROVED") {
          // Compute period boundaries from the payment date.
          // For MONTHLY plans the period is 1 month; for YEARLY it is 12 months.
          const periodStart = new Date()
          const periodEnd = new Date(periodStart)
          if (subscription.plan === "YEARLY") {
            periodEnd.setMonth(periodEnd.getMonth() + 12)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          })
        } else if (paymentStatus === "REJECTED") {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "PAST_DUE" },
          })
        }
      } else {
        console.warn("[MP webhook] payment event received but no matching subscription found. preapprovalId:", preapprovalId, "payer:", paymentInfo.payer?.email)
      }
    }

    if (type === "subscription_preapproval") {
      const preapproval = new PreApproval(client)
      const subInfo = await preapproval.get({ id: data.id })

      if (subInfo) {
        const subscription = await prisma.subscription.findUnique({
          where: { mercadoPagoSubscriptionId: String(data.id) },
        })

        if (subscription) {
          const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELLED"> = {
            authorized: "ACTIVE",
            paused: "PAST_DUE",
            cancelled: "CANCELLED",
          }
          const newStatus = statusMap[subInfo.status ?? ""] ?? subscription.status

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: newStatus },
          })
        } else {
          console.warn("[MP webhook] subscription_preapproval event for unknown subscription id:", data.id)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[MP webhook] Unhandled error:", error)

    // Distinguish transient errors (MP should retry) from permanent ones (no point retrying).
    // Network/DB errors are transient → 500 so MP retries.
    // Validation/parse errors are permanent → 200 to stop retries.
    const isPermanent =
      error instanceof SyntaxError || // malformed JSON
      (error instanceof Error && error.message.includes("not found"))

    if (isPermanent) {
      return NextResponse.json({ error: "Permanent error, will not retry" }, { status: 200 })
    }
    return NextResponse.json({ error: "Transient error" }, { status: 500 })
  }
}
