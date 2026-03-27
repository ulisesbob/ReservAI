import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createSubscription } from "@/lib/mercadopago"

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const { plan } = await request.json()

    if (!plan || !["MONTHLY", "YEARLY"].includes(plan)) {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
    })
    if (!subscription) {
      return NextResponse.json({ error: "No hay suscripcion" }, { status: 404 })
    }
    if (subscription.plan === plan) {
      return NextResponse.json({ error: "Ya estas en este plan" }, { status: 400 })
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || ""
    const backUrl = `${origin}/settings/billing`

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
