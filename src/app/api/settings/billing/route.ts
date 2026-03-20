import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSubscription } from "@/lib/mercadopago"

export async function GET() {
  try {
    const session = await requireAdmin()

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { plan } = body

    if (plan !== "MONTHLY" && plan !== "YEARLY") {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 })
    }

    // Prevent duplicate subscriptions: if already has a pending MP subscription, reject
    const existing = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
      select: { mercadoPagoSubscriptionId: true, status: true },
    })
    if (existing?.mercadoPagoSubscriptionId && existing.status === "ACTIVE") {
      return NextResponse.json({ error: "Ya tenes una suscripcion activa" }, { status: 409 })
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || ""
    const backUrl = `${origin}/settings/billing`

    const mpSubscription = await createSubscription(plan, session.email, backUrl)

    const initPoint = mpSubscription.init_point
    if (!initPoint) {
      console.error("MercadoPago did not return init_point:", mpSubscription)
      return NextResponse.json({ error: "Error al crear suscripcion en MercadoPago" }, { status: 502 })
    }

    await prisma.subscription.upsert({
      where: { restaurantId: session.restaurantId },
      create: {
        restaurantId: session.restaurantId,
        plan,
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        mercadoPagoSubscriptionId: mpSubscription.id ? String(mpSubscription.id) : null,
      },
      update: {
        plan,
        mercadoPagoSubscriptionId: mpSubscription.id ? String(mpSubscription.id) : null,
      },
    })

    return NextResponse.json({ initPoint })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }
    console.error("Billing error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
