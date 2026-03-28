import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"

/**
 * Cron endpoint: sends WhatsApp review-request messages for reservations
 * that were COMPLETED 2–4 hours ago and haven't had a review request sent yet.
 *
 * Protected by CRON_SECRET header.
 * Intended to run every hour via Vercel Cron or external scheduler.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const expected = `Bearer ${cronSecret}`
  if (
    authHeader.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    // Find COMPLETED reservations within the 2–4h window that haven't been sent a review request
    const reservations = await prisma.reservation.findMany({
      where: {
        status: "COMPLETED",
        // @ts-expect-error — field pending Prisma migration
        reviewRequestSent: false,
        dateTime: {
          gte: fourHoursAgo,
          lte: twoHoursAgo,
        },
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            whatsappPhoneId: true,
            whatsappToken: true,
          },
        },
      },
      take: 200,
    })

    let sent = 0
    let failed = 0

    for (const reservation of reservations) {
      // @ts-expect-error — restaurant relation pending Prisma migration
      const rest = reservation.restaurant

      // Skip if restaurant has no WhatsApp configured
      if (!rest.whatsappPhoneId || !rest.whatsappToken) {
        // Mark as sent to avoid re-processing
        await prisma.reservation.update({
          where: { id: reservation.id },
          // @ts-expect-error — field pending Prisma migration
          data: { reviewRequestSent: true },
        })
        continue
      }

      const token = safeDecrypt(rest.whatsappToken)
      const message =
        `Hola ${reservation.customerName}! Gracias por visitarnos en ${rest.name}. ` +
        `¿Cómo fue tu experiencia? Respondé del 1 al 5 ` +
        `(1 = muy mal, 5 = excelente) y si queres dejanos un comentario.`

      try {
        await sendWhatsAppMessage(rest.whatsappPhoneId, token, reservation.customerPhone, message)
        sent++
      } catch (err) {
        console.error(`[cron/reviews] WhatsApp failed for reservation ${reservation.id}:`, err)
        failed++
      }

      // Mark as sent regardless of outcome to avoid infinite retries
      await prisma.reservation.update({
        where: { id: reservation.id },
        // @ts-expect-error — field pending Prisma migration
        data: { reviewRequestSent: true },
      })
    }

    const summary = { status: "ok", processed: reservations.length, sent, failed }
    console.info("[cron/reviews] Done —", JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Cron reviews error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
