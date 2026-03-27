import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMercadoPagoClient, verifyWebhookSignature } from "@/lib/mercadopago"
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

    // FIX 1: Verify MercadoPago webhook signature before processing any payload.
    // For IPN-style requests the id arrives as a query param; for the newer
    // webhook format it arrives in the JSON body. We must extract it first so
    // we can pass it to verifyWebhookSignature as the manifest's dataId.
    const xSignature = request.headers.get("x-signature")
    const xRequestId = request.headers.get("x-request-id")

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

    // FIX 1 (continued): Reject the request if the signature is invalid.
    // paymentId is the canonical dataId used in the MP manifest. If we still
    // have no id at this point, we reject with 400 below — but only after
    // verifying the signature when an id is present.
    if (paymentId && !verifyWebhookSignature(xSignature, xRequestId, paymentId)) {
      console.error("[Deposit webhook] Signature verification failed for paymentId:", paymentId)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
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
      // FIX 2: Validate that the paid amount matches the expected deposit amount
      // before marking as PAID. A mismatch indicates a tampered or wrong payment
      // and must never result in a PAID status update.
      const paidAmount = paymentInfo.transaction_amount
      const expectedAmount = reservation.depositAmount
      if (paidAmount == null || expectedAmount == null || paidAmount !== expectedAmount) {
        console.error(
          "[Deposit webhook] Amount mismatch — expected:",
          expectedAmount,
          "received:",
          paidAmount,
          "reservationId:",
          reservation.id,
        )
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
      }

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
      // FIX 5: Return 400 (not 200) for permanent errors. MercadoPago retries
      // on 5xx but stops on 4xx, which is the desired behavior for unrecoverable
      // conditions like malformed JSON or unknown resources.
      return NextResponse.json({ error: "Permanent error, will not retry" }, { status: 400 })
    }
    return NextResponse.json({ error: "Transient error" }, { status: 500 })
  }
}
