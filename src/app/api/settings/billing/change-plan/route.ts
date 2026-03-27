import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createSubscription } from "@/lib/mercadopago"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { billingSchema, parseBody } from "@/lib/schemas"

export async function POST(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.billing, request)
    if (blocked) return blocked
    const session = await requireAdmin()
    const body = await request.json()
    const parsed = parseBody(billingSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { plan } = parsed.data

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
    })
    if (!subscription) {
      return NextResponse.json({ error: "No hay suscripcion" }, { status: 404 })
    }
    if (subscription.plan === plan) {
      return NextResponse.json({ error: "Ya estas en este plan" }, { status: 400 })
    }

    const trustedOrigin = process.env.NEXTAUTH_URL || ""
    const backUrl = `${trustedOrigin}/settings/billing`

    let mpSubscription
    try {
      mpSubscription = await createSubscription(plan, session.email, backUrl)
    } catch (mpError) {
      console.error("[billing] MercadoPago change-plan failed:", JSON.stringify(mpError))
      return NextResponse.json({ error: "Error al cambiar plan en MercadoPago" }, { status: 502 })
    }

    const initPoint = mpSubscription.init_point
    if (!initPoint) {
      console.error("[billing] MercadoPago did not return init_point:", mpSubscription)
      return NextResponse.json({ error: "Error al cambiar plan en MercadoPago" }, { status: 502 })
    }

    const mpSubId = mpSubscription.id ? String(mpSubscription.id) : null

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        mercadoPagoSubscriptionId: mpSubId || subscription.mercadoPagoSubscriptionId,
      },
    })

    return NextResponse.json({ success: true, redirectUrl: initPoint })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }
    console.error("[billing] Change plan error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
