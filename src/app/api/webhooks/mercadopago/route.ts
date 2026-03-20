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
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const client = getMercadoPagoClient()

    if (type === "payment") {
      const mpPayment = new MPPayment(client)
      const paymentInfo = await mpPayment.get({ id: data.id })

      if (!paymentInfo) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      // MercadoPago includes preapproval_id at top level for subscription payments,
      // or in metadata. Try both, plus point_of_interaction for additional lookup.
      const preapprovalId =
        (paymentInfo as unknown as Record<string, unknown>).preapproval_id as string | undefined
        ?? paymentInfo.metadata?.preapproval_id as string | undefined

      let subscription = preapprovalId
        ? await prisma.subscription.findUnique({
            where: { mercadoPagoSubscriptionId: preapprovalId },
          })
        : null

      // Fallback: look up by payer email if preapprovalId not found
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

    if (type === "subscription_preapproval") {
      const preapproval = new PreApproval(client)
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
    // Return 200 to prevent MercadoPago from retrying on unrecoverable errors
    return NextResponse.json({ error: "Processed with error" }, { status: 200 })
  }
}
