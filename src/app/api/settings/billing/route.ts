import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSubscription } from "@/lib/mercadopago"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.billing, request)
    if (blocked) return blocked
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
    const blocked = await applyRateLimit(rateLimiters.billing, request)
    if (blocked) return blocked
    const session = await requireAdmin()
    const body = await request.json()
    const { plan } = body

    if (plan !== "MONTHLY" && plan !== "YEARLY") {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 })
    }

    // Prevent duplicate subscriptions
    const existing = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
      select: { mercadoPagoSubscriptionId: true, status: true, trialEndsAt: true },
    })
    if (existing?.mercadoPagoSubscriptionId && existing.status === "ACTIVE") {
      return NextResponse.json({ error: "Ya tenes una suscripcion activa" }, { status: 409 })
    }
    if (existing?.status === "PAST_DUE" && existing.mercadoPagoSubscriptionId) {
      return NextResponse.json(
        { error: "Tenes un pago pendiente. Regulariza tu suscripcion actual antes de crear una nueva." },
        { status: 409 }
      )
    }

    const trustedOrigin = process.env.NEXTAUTH_URL || ""
    const backUrl = `${trustedOrigin}/settings/billing`

    let mpSubscription
    try {
      mpSubscription = await createSubscription(plan, session.email, backUrl)
    } catch (mpError) {
      // The MercadoPago SDK throws the raw API response body (a plain object,
      // not an Error instance) when the HTTP status is not 2xx. This means
      // 401 Unauthorized from MP surfaces here as a thrown object like:
      // { message: "...", error: "...", status: 401, cause: [...] }
      // We log the full error and return a 502 to the client.
      console.error("[billing] MercadoPago createSubscription failed:", JSON.stringify(mpError))
      const mpErrObj = mpError as Record<string, unknown>
      const mpStatus = typeof mpErrObj?.status === "number" ? mpErrObj.status : null
      if (mpStatus === 401) {
        // Token is invalid, expired, or revoked. The MERCADOPAGO_ACCESS_TOKEN
        // in .env must be refreshed via the MercadoPago developer dashboard.
        console.error("[billing] MercadoPago 401: access token is invalid or expired. Refresh MERCADOPAGO_ACCESS_TOKEN in environment variables.")
        return NextResponse.json(
          { error: "Error de autenticacion con MercadoPago. Contacta al administrador." },
          { status: 502 },
        )
      }
      return NextResponse.json({ error: "Error al crear suscripcion en MercadoPago" }, { status: 502 })
    }

    const initPoint = mpSubscription.init_point
    if (!initPoint) {
      console.error("[billing] MercadoPago did not return init_point:", mpSubscription)
      return NextResponse.json({ error: "Error al crear suscripcion en MercadoPago" }, { status: 502 })
    }

    const mpSubId = mpSubscription.id ? String(mpSubscription.id) : null

    if (existing) {
      // Update existing subscription — don't reset trialEndsAt
      await prisma.subscription.update({
        where: { restaurantId: session.restaurantId },
        data: {
          plan,
          mercadoPagoSubscriptionId: mpSubId,
        },
      })
    } else {
      // Create new subscription with trial
      await prisma.subscription.create({
        data: {
          restaurantId: session.restaurantId,
          plan,
          status: "TRIALING",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          mercadoPagoSubscriptionId: mpSubId,
        },
      })
    }

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
    console.error("[billing] Unhandled error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
