import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature, mercadoPagoClient } from "@/lib/mercadopago"
import { PreApproval, Payment as MPPayment } from "mercadopago"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    const xSignature = request.headers.get("x-signature")
    const xRequestId = request.headers.get("x-request-id")

    if (!verifyWebhookSignature(xSignature, xRequestId, data?.id)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    if (type === "payment") {
      const mpPayment = new MPPayment(mercadoPagoClient)
      const paymentInfo = await mpPayment.get({ id: data.id })

      if (!paymentInfo) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      const preapprovalId = paymentInfo.metadata?.preapproval_id as string | undefined

      if (preapprovalId) {
        const subscription = await prisma.subscription.findUnique({
          where: { mercadoPagoSubscriptionId: preapprovalId },
        })

        if (subscription) {
          const paymentStatus = paymentInfo.status === "approved" ? "APPROVED"
            : paymentInfo.status === "rejected" ? "REJECTED"
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
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: "ACTIVE" },
            })
          } else if (paymentStatus === "REJECTED") {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: "PAST_DUE" },
            })
          }
        }
      }
    }

    if (type === "subscription_preapproval") {
      const preapproval = new PreApproval(mercadoPagoClient)
      const subInfo = await preapproval.get({ id: data.id })

      if (subInfo) {
        const subscription = await prisma.subscription.findUnique({
          where: { mercadoPagoSubscriptionId: String(data.id) },
        })

        if (subscription) {
          const statusMap: Record<string, string> = {
            authorized: "ACTIVE",
            paused: "PAST_DUE",
            cancelled: "CANCELLED",
          }
          const newStatus = statusMap[subInfo.status ?? ""] ?? subscription.status

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: newStatus as "ACTIVE" | "PAST_DUE" | "CANCELLED" },
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("MercadoPago webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
