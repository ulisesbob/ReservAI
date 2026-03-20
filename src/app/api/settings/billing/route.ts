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

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || ""
    const backUrl = `${origin}/settings/billing`

    const mpSubscription = await createSubscription(plan, session.email, backUrl)

    await prisma.subscription.update({
      where: { restaurantId: session.restaurantId },
      data: {
        plan,
        mercadoPagoSubscriptionId: mpSubscription.id ? String(mpSubscription.id) : null,
      },
    })

    return NextResponse.json({
      initPoint: mpSubscription.init_point,
    })
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
