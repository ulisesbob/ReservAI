import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMercadoPagoClient } from "@/lib/mercadopago"
import { Payment as MPPayment } from "mercadopago"

/**
 * POST /api/webhooks/deposits
 *
 * MercadoPago sends IPN (Instant Payment Notification) webhooks for
 * Preference-based one-time payments. The notification payload uses
 * `topic=payment` with `id` as the payment ID.
 *
 * Unlike subscription webhooks, Preference payments use IPN format:
 * - Query param `topic` = "payment" | "merchant_order"
 * - Query param `id` = the resource ID
 *
 * We also handle the newer webhook format where body contains { type, data }.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const topic = url.searchParams.get("topic") || url.searchParams.get("type")
    let paymentId: string | null = url.searchParams.get("id")

    // Newer webhook format: JSON body with { type, data: { id } }
    if (!paymentId) {
      try {
        const body = await request.json()
        if (body?.data?.id) {
          paymentId = String(body.data.id)
        }
        if (body?.type === "payment" && !topic) {
          // Treat as payment topic
        }
      } catch {
        // Body might not be JSON for IPN-style notifications
      }
    }

    // We only care about payment notifications
    if (topic && topic !== "payment") {
      return NextResponse.json({ ok: true })
    }

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 })
    }

    const client = getMercadoPagoClient()
    const mpPayment = new MPPayment(client)
    const paymentInfo = await mpPayment.get({ id: Number(paymentId) })

    if (!paymentInfo) {
      return NextResponse.json({ error: "Payment not found in MP" }, { status: 404 })
    }

    // The external_reference was set to the reservationId when creating the preference.
    const reservationId = paymentInfo.external_reference
    if (!reservationId) {
      console.warn("[Deposit webhook] Payment has no external_reference:", paymentId)
      return NextResponse.json({ ok: true })
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      console.warn("[Deposit webhook] No reservation found for external_reference:", reservationId)
      return NextResponse.json({ ok: true })
    }

    if (paymentInfo.status === "approved") {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          depositStatus: "PAID",
          status: reservation.status === "PENDING_DEPOSIT" ? "PENDING" : reservation.status,
        },
      })
      console.log("[Deposit webhook] Deposit PAID for reservation:", reservation.id)
    } else if (paymentInfo.status === "rejected") {
      // Keep PENDING_DEPOSIT — customer can retry
      console.log("[Deposit webhook] Deposit payment REJECTED for reservation:", reservation.id)
    } else if (paymentInfo.status === "refunded") {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { depositStatus: "REFUNDED" },
      })
      console.log("[Deposit webhook] Deposit REFUNDED for reservation:", reservation.id)
    }
    // For "pending" or "in_process", we do nothing — keep waiting.

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Deposit webhook] Unhandled error:", error)

    const isPermanent =
      error instanceof SyntaxError ||
      (error instanceof Error && error.message.includes("not found"))

    if (isPermanent) {
      return NextResponse.json({ error: "Permanent error" }, { status: 200 })
    }
    return NextResponse.json({ error: "Transient error" }, { status: 500 })
  }
}
