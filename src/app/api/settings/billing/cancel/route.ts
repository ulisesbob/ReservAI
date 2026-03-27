import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago"
import { PreApproval } from "mercadopago"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.billing, request)
    if (blocked) return blocked
    const session = await requireAdmin()
    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
    })

    if (!subscription) {
      return NextResponse.json({ error: "No hay suscripcion activa" }, { status: 404 })
    }
    if (subscription.status === "CANCELLED") {
      return NextResponse.json({ error: "La suscripcion ya esta cancelada" }, { status: 400 })
    }

    if (subscription.mercadoPagoSubscriptionId) {
      try {
        const client = getMercadoPagoClient()
        const preapproval = new PreApproval(client)
        await preapproval.update({
          id: subscription.mercadoPagoSubscriptionId,
          body: { status: "cancelled" },
        })
      } catch (error) {
        console.error("[billing] MercadoPago cancellation error:", error)
      }
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }
    console.error("[billing] Cancel error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
