# Fase 1 — Monetización Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add billing (MercadoPago), landing page with pricing, onboarding wizard, and transactional email (Resend) to ReservaYa.

**Architecture:** Extend existing Next.js 14 monolith with new Prisma models (Subscription, Payment), MercadoPago checkout hosted + webhooks for recurring billing, JWT-based billing middleware, public landing page, 3-step onboarding wizard, and Resend email service.

**Tech Stack:** Next.js 14, Prisma 7.5, MercadoPago SDK, Resend + React Email, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-20-fase1-monetizacion-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/mercadopago.ts` | MercadoPago client: create subscription, create preference, verify webhook |
| `src/lib/email.ts` | Resend wrapper: send email with template |
| `src/lib/email-templates/welcome.tsx` | React Email template: welcome email |
| `src/lib/email-templates/reservation-confirmation.tsx` | React Email template: reservation confirmation |
| `src/app/api/webhooks/mercadopago/route.ts` | Webhook handler for MercadoPago events |
| `src/app/api/settings/billing/route.ts` | API: GET billing status, POST create subscription |
| `src/app/settings/billing/page.tsx` | Billing settings page UI |
| `src/app/settings/billing/billing-form.tsx` | Client component: plan selection + payment actions |
| `src/app/onboarding/page.tsx` | Onboarding wizard (3 steps) |
| `src/app/(landing)/page.tsx` | Public landing page (replaces current page.tsx) |
| `src/app/(landing)/layout.tsx` | Landing layout (no dashboard chrome) |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add Subscription, Payment models, enums, email field on Restaurant |
| `src/auth.config.ts` | Add subscriptionStatus, trialEndsAt, onboardingCompleted to JWT + billing redirect logic |
| `src/auth.ts` | Extend authorize to fetch subscription data, set maxAge: 3600 |
| `src/lib/auth.ts` | Extend session types with subscription fields |
| `src/app/api/register/route.ts` | Create Subscription atomically with Restaurant |
| `src/app/api/reservations/route.ts` | Send confirmation email after creating reservation |
| `src/app/settings/settings-nav.tsx` | Add "Facturación" nav item |
| `src/app/page.tsx` | Replace with redirect logic (logged in → dashboard, else → landing) |

---

## Task 1: Prisma Models — Subscription & Payment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema.prisma**

Add after existing enums (after `MessageRole`):

```prisma
enum SubscriptionPlan {
  MONTHLY
  YEARLY
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
  REFUNDED
}
```

- [ ] **Step 2: Add Subscription model**

Add after Message model:

```prisma
model Subscription {
  id                        String             @id @default(cuid())
  restaurantId              String             @unique
  plan                      SubscriptionPlan   @default(MONTHLY)
  status                    SubscriptionStatus @default(TRIALING)
  trialEndsAt               DateTime
  currentPeriodStart        DateTime?
  currentPeriodEnd          DateTime?
  mercadoPagoSubscriptionId String?            @unique
  createdAt                 DateTime           @default(now())
  updatedAt                 DateTime           @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  payments   Payment[]
}
```

- [ ] **Step 3: Add Payment model**

```prisma
model Payment {
  id                   String        @id @default(cuid())
  subscriptionId       String
  amount               Decimal       @db.Decimal(12,2)
  currency             String        @default("ARS")
  status               PaymentStatus @default(PENDING)
  mercadoPagoPaymentId String?       @unique
  paidAt               DateTime?
  createdAt            DateTime      @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
}
```

- [ ] **Step 4: Add email and subscription relation to Restaurant**

In the Restaurant model, add:

```prisma
  email        String?
  subscription Subscription?
```

- [ ] **Step 5: Run migration**

Run: `npx prisma migrate dev --name add-billing-models`
Expected: Migration created and applied, Prisma Client regenerated.

- [ ] **Step 6: Verify generated types**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: add Subscription and Payment models for billing"
```

---

## Task 2: Update Registration to Create Subscription

**Files:**
- Modify: `src/app/api/register/route.ts`

- [ ] **Step 1: Update the prisma.restaurant.create call**

In `src/app/api/register/route.ts`, replace the `prisma.restaurant.create` call (lines 69-90) with a version that includes a nested Subscription create:

```typescript
const restaurant = await prisma.restaurant.create({
  data: {
    name: restaurantName,
    slug: finalSlug,
    timezone: timezone || "America/Argentina/Buenos_Aires",
    maxCapacity: 50,
    maxPartySize: 20,
    users: {
      create: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
      },
    },
    subscription: {
      create: {
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    },
  },
  include: {
    users: {
      select: { id: true, email: true, name: true, role: true },
    },
  },
})
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/register/route.ts
git commit -m "feat: create trial subscription on restaurant registration"
```

---

## Task 3: Extend JWT with Subscription Data

**Files:**
- Modify: `src/auth.config.ts`
- Modify: `src/auth.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update auth.ts — set maxAge and fetch subscription in authorize**

In `src/auth.ts`, update the NextAuth config to add `session.maxAge` and extend the authorize return to include subscription fields:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 3600 },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Initial login: populate from user object
      if (user) {
        const u = user as User & {
          role?: string
          restaurantId?: string
          subscriptionStatus?: string
          trialEndsAt?: string | null
          onboardingCompleted?: boolean
        }
        token.id = u.id
        token.role = u.role
        token.restaurantId = u.restaurantId
        token.subscriptionStatus = u.subscriptionStatus
        token.trialEndsAt = u.trialEndsAt
        token.onboardingCompleted = u.onboardingCompleted
        token.lastRefresh = Date.now()
        return token
      }

      // Periodic refresh: every 5 minutes, re-fetch from DB
      const lastRefresh = token.lastRefresh as number | undefined
      const fiveMinutes = 5 * 60 * 1000
      if (!lastRefresh || Date.now() - lastRefresh > fiveMinutes) {
        const fresh = await prisma.restaurant.findUnique({
          where: { id: token.restaurantId as string },
          select: {
            operatingHours: true,
            subscription: { select: { status: true, trialEndsAt: true } },
          },
        })
        if (fresh) {
          token.subscriptionStatus = fresh.subscription?.status ?? "TRIALING"
          token.trialEndsAt = fresh.subscription?.trialEndsAt?.toISOString() ?? null
          token.onboardingCompleted = !!fresh.operatingHours
          token.lastRefresh = Date.now()
        }
      }

      return token
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            restaurantId: true,
            restaurant: {
              select: {
                operatingHours: true,
                subscription: {
                  select: {
                    status: true,
                    trialEndsAt: true,
                  },
                },
              },
            },
          },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          subscriptionStatus: user.restaurant.subscription?.status ?? "TRIALING",
          trialEndsAt: user.restaurant.subscription?.trialEndsAt?.toISOString() ?? null,
          onboardingCompleted: !!user.restaurant.operatingHours,
        }
      },
    }),
  ],
})
```

- [ ] **Step 2: Update auth.config.ts — session callback + billing redirect (edge-safe only)**

Replace `src/auth.config.ts` entirely. Note: the `jwt` callback with DB refresh lives in `auth.ts` (Node runtime). `auth.config.ts` only has the `session` callback and `authorized` (both edge-safe):

```typescript
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.restaurantId = token.restaurantId as string
      session.user.subscriptionStatus = token.subscriptionStatus as string
      session.user.trialEndsAt = token.trialEndsAt as string | null
      session.user.onboardingCompleted = token.onboardingCompleted as boolean
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const protectedPaths = ["/dashboard", "/settings", "/onboarding"]
      const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

      if (isProtected && !isLoggedIn) return false

      const authPaths = ["/login", "/register"]
      const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Billing gate: if logged in and accessing protected routes (except billing & onboarding)
      if (isLoggedIn && isProtected) {
        const billingExempt = ["/settings/billing", "/onboarding"]
        const isBillingExempt = billingExempt.some((path) => pathname.startsWith(path))

        if (!isBillingExempt) {
          const status = auth?.user?.subscriptionStatus
          const trialEndsAt = auth?.user?.trialEndsAt

          const isTrialExpired = status === "TRIALING" && trialEndsAt && new Date(trialEndsAt) < new Date()
          const isInactive = status === "PAST_DUE" || status === "CANCELLED"

          if (isTrialExpired || isInactive) {
            return Response.redirect(new URL("/settings/billing", nextUrl))
          }

          // Onboarding gate: redirect to onboarding if not completed
          const onboardingCompleted = auth?.user?.onboardingCompleted
          if (!onboardingCompleted && !pathname.startsWith("/onboarding")) {
            return Response.redirect(new URL("/onboarding", nextUrl))
          }
        }
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
```

- [ ] **Step 3: Update src/lib/auth.ts — extend session type**

```typescript
import { auth } from "@/auth"

export async function getSession() {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.restaurantId) {
    return null
  }

  return {
    userId: session.user.id,
    restaurantId: session.user.restaurantId,
    role: session.user.role as "ADMIN" | "EMPLOYEE",
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    subscriptionStatus: session.user.subscriptionStatus as string,
    trialEndsAt: session.user.trialEndsAt as string | null,
    onboardingCompleted: session.user.onboardingCompleted as boolean,
  }
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (session.role !== "ADMIN") {
    throw new Error("Forbidden")
  }
  return session
}
```

- [ ] **Step 4: Add NextAuth type augmentation**

Create or update `src/types/next-auth.d.ts`:

```typescript
import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    restaurantId?: string
    subscriptionStatus?: string
    trialEndsAt?: string | null
    onboardingCompleted?: boolean
  }

  interface Session {
    user: User & {
      id: string
      role: string
      restaurantId: string
      subscriptionStatus: string
      trialEndsAt: string | null
      onboardingCompleted: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    restaurantId?: string
    subscriptionStatus?: string
    trialEndsAt?: string | null
    onboardingCompleted?: boolean
    lastRefresh?: number
  }
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/auth.config.ts src/auth.ts src/lib/auth.ts src/types/
git commit -m "feat: extend JWT with subscription status and billing gate middleware"
```

---

## Task 4: MercadoPago Integration

**Files:**
- Create: `src/lib/mercadopago.ts`
- Create: `src/app/api/webhooks/mercadopago/route.ts`
- Create: `src/app/api/settings/billing/route.ts`

- [ ] **Step 1: Install mercadopago SDK**

Run: `npm install mercadopago`

- [ ] **Step 2: Create src/lib/mercadopago.ts**

```typescript
import crypto from "crypto"
import { MercadoPagoConfig, PreApproval } from "mercadopago"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

const PLANS = {
  MONTHLY: {
    reason: "ReservaYa - Plan Mensual",
    amount: 25000,
    frequency: 1,
    frequencyType: "months" as const,
  },
  YEARLY: {
    reason: "ReservaYa - Plan Anual",
    amount: 240000,
    frequency: 12,
    frequencyType: "months" as const,
  },
}

export async function createSubscription(
  plan: "MONTHLY" | "YEARLY",
  payerEmail: string,
  backUrl: string,
) {
  const planConfig = PLANS[plan]
  const preapproval = new PreApproval(client)

  const result = await preapproval.create({
    body: {
      reason: planConfig.reason,
      auto_recurring: {
        frequency: planConfig.frequency,
        frequency_type: planConfig.frequencyType,
        transaction_amount: planConfig.amount,
        currency_id: "ARS",
      },
      payer_email: payerEmail,
      back_url: backUrl,
      status: "pending",
    },
  })

  return result
}

export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
): boolean {
  if (!xSignature || !xRequestId) return false

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return false

  // MercadoPago v2 webhook signature validation
  const parts = xSignature.split(",")
  const tsRaw = parts.find((p) => p.trim().startsWith("ts="))
  const hashRaw = parts.find((p) => p.trim().startsWith("v1="))

  if (!tsRaw || !hashRaw) return false

  const ts = tsRaw.split("=")[1]
  const hash = hashRaw.split("=")[1]

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  return hash === expected
}

export { client as mercadoPagoClient, PLANS }
```

- [ ] **Step 3: Create src/app/api/webhooks/mercadopago/route.ts**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature, mercadoPagoClient } from "@/lib/mercadopago"
import { PreApproval, Payment as MPPayment } from "mercadopago"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Verify webhook signature
    const xSignature = request.headers.get("x-signature")
    const xRequestId = request.headers.get("x-request-id")

    if (!verifyWebhookSignature(xSignature, xRequestId, data?.id)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    if (type === "payment") {
      const mpPayment = new MPPayment(mercadoPagoClient)
      const paymentInfo = await mpPayment.get({ id: data.id })

      if (!paymentInfo) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      const preapprovalId = paymentInfo.metadata?.preapproval_id as string | undefined

      if (preapprovalId) {
        const subscription = await prisma.subscription.findUnique({
          where: { mercadoPagoSubscriptionId: preapprovalId },
        })

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
    }

    if (type === "subscription_preapproval") {
      const preapproval = new PreApproval(mercadoPagoClient)
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create src/app/api/settings/billing/route.ts**

```typescript
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSubscription, PLANS } from "@/lib/mercadopago"

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
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
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
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/mercadopago.ts src/app/api/webhooks/mercadopago/ src/app/api/settings/billing/
git commit -m "feat: add MercadoPago billing integration with webhook and API"
```

---

## Task 5: Billing Settings Page

**Files:**
- Create: `src/app/settings/billing/page.tsx`
- Create: `src/app/settings/billing/billing-form.tsx`
- Modify: `src/app/settings/settings-nav.tsx`

- [ ] **Step 1: Create src/app/settings/billing/billing-form.tsx**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Subscription {
  plan: "MONTHLY" | "YEARLY"
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"
  trialEndsAt: string
  currentPeriodEnd: string | null
  payments: Array<{
    id: string
    amount: string
    status: string
    paidAt: string | null
    createdAt: string
  }>
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Activa", variant: "default" },
  PAST_DUE: { label: "Pago pendiente", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
}

export function BillingForm({ subscription }: { subscription: Subscription | null }) {
  const [loading, setLoading] = useState<"MONTHLY" | "YEARLY" | null>(null)

  async function handleSubscribe(plan: "MONTHLY" | "YEARLY") {
    setLoading(plan)
    try {
      const res = await fetch("/api/settings/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.initPoint) {
        window.location.href = data.initPoint
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(null)
    }
  }

  const statusInfo = STATUS_LABELS[subscription?.status ?? "TRIALING"]
  const isActive = subscription?.status === "ACTIVE"
  const isTrialing = subscription?.status === "TRIALING"
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Estado de Suscripcion
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </CardTitle>
          <CardDescription>
            {isTrialing && trialDaysLeft > 0 && `Te quedan ${trialDaysLeft} dias de prueba gratuita.`}
            {isTrialing && trialDaysLeft === 0 && "Tu periodo de prueba ha terminado."}
            {isActive && `Plan ${subscription?.plan === "YEARLY" ? "Anual" : "Mensual"} activo.`}
            {subscription?.status === "PAST_DUE" && "Hay un problema con tu pago. Actualiza tu suscripcion."}
            {subscription?.status === "CANCELLED" && "Tu suscripcion fue cancelada. Suscribite de nuevo para continuar."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Plan Selection */}
      {!isActive && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Plan Mensual</CardTitle>
              <CardDescription>Facturacion mensual, cancela cuando quieras</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">$25.000 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("MONTHLY")}
                disabled={loading !== null}
              >
                {loading === "MONTHLY" ? "Procesando..." : "Suscribirme"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Plan Anual
                <Badge>Ahorra 20%</Badge>
              </CardTitle>
              <CardDescription>Facturacion anual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">$240.000 <span className="text-sm font-normal text-muted-foreground">/año</span></p>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("YEARLY")}
                disabled={loading !== null}
              >
                {loading === "YEARLY" ? "Procesando..." : "Suscribirme"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment History */}
      {subscription?.payments && subscription.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscription.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">${Number(payment.amount).toLocaleString("es-AR")}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant={payment.status === "APPROVED" ? "default" : "destructive"}>
                    {payment.status === "APPROVED" ? "Aprobado" : payment.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/settings/billing/page.tsx**

```tsx
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillingForm } from "./billing-form"

export default async function BillingPage() {
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

  const serialized = subscription ? {
    ...subscription,
    trialEndsAt: subscription.trialEndsAt.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    payments: subscription.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  } : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Facturacion</h2>
        <p className="text-muted-foreground">Gestiona tu suscripcion y pagos.</p>
      </div>
      <BillingForm subscription={serialized} />
    </div>
  )
}
```

- [ ] **Step 3: Add billing to settings nav**

In `src/app/settings/settings-nav.tsx`, add to navItems array:

```typescript
import { Store, Brain, MessageCircle, Users, CreditCard } from "lucide-react"

const navItems = [
  { href: "/settings/restaurant", label: "Restaurante", icon: Store },
  { href: "/settings/knowledge-base", label: "Knowledge Base", icon: Brain },
  { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/settings/team", label: "Equipo", icon: Users },
  { href: "/settings/billing", label: "Facturacion", icon: CreditCard },
]
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/billing/ src/app/settings/settings-nav.tsx
git commit -m "feat: add billing settings page with plan selection and payment history"
```

---

## Task 6: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace src/app/page.tsx with full landing page**

Replace the entire file with a landing page that includes Hero, Features, Pricing, FAQ, and Footer sections. Keep the redirect-to-dashboard logic for logged-in users.

The landing page uses existing shadcn/ui components (Button, Card) and Tailwind classes. It's a single server component.

Key sections:
- **Hero:** gradient background, title "ReservaYa", subtitle, CTA → `/register`
- **Features:** 4 cards with icons (MessageCircle, CalendarDays, Settings, Users from lucide-react)
- **Pricing:** single card with monthly/annual toggle (client component island), CTA → `/register`
- **FAQ:** accordion-style with 5 questions
- **Footer:** simple copyright

Since the pricing toggle needs client interactivity, extract a small `PricingToggle` client component inline or as a separate file. For simplicity, use a `"use client"` wrapper just for the pricing section.

Create `src/app/pricing-toggle.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const features = [
  "Reservas ilimitadas",
  "Agente IA por WhatsApp",
  "Panel de gestion",
  "Multi-usuario (admin + empleados)",
  "Knowledge Base personalizable",
  "Soporte por email",
]

export function PricingToggle() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3 bg-muted rounded-full p-1">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setAnnual(true)}
        >
          Anual
        </button>
      </div>

      <Card className="w-full max-w-md border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ReservaYa</CardTitle>
          {annual && <Badge className="w-fit mx-auto">Ahorra 20%</Badge>}
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <span className="text-4xl font-bold">
              ${annual ? "240.000" : "25.000"}
            </span>
            <span className="text-muted-foreground">
              /{annual ? "año" : "mes"}
            </span>
          </div>
          <ul className="space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="w-full">
            <Link href="/register">Proba 14 dias gratis</Link>
          </Button>
          <p className="text-xs text-muted-foreground">Sin tarjeta. Cancela cuando quieras.</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

Then update `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, CalendarDays, Settings, Users, ChevronDown } from "lucide-react"
import { PricingToggle } from "./pricing-toggle"

const features = [
  {
    icon: MessageCircle,
    title: "Reservas por WhatsApp",
    description: "Tus clientes reservan chateando con un asistente de IA. Sin apps, sin formularios.",
  },
  {
    icon: CalendarDays,
    title: "Panel de gestion",
    description: "Visualiza, confirma y gestiona todas las reservas del dia desde un solo lugar.",
  },
  {
    icon: Settings,
    title: "Configuracion en minutos",
    description: "Defini tus horarios, capacidad y personaliza el asistente con la info de tu restaurante.",
  },
  {
    icon: Users,
    title: "Multi-usuario",
    description: "Invita a tu equipo. Cada empleado accede al panel con su propia cuenta.",
  },
]

const faqs = [
  {
    q: "¿Que pasa al terminar el trial?",
    a: "Si no elegis un plan, se bloquea el acceso al panel. Tus datos se mantienen y podes reactivar en cualquier momento.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Si, podes cancelar tu suscripcion cuando quieras. No hay permanencia minima.",
  },
  {
    q: "¿Que medios de pago aceptan?",
    a: "Aceptamos tarjetas de credito/debito, transferencia bancaria y todos los medios de MercadoPago.",
  },
  {
    q: "¿Necesito un numero de WhatsApp Business?",
    a: "Si, necesitas una cuenta de WhatsApp Business API (Meta) para recibir reservas por WhatsApp.",
  },
  {
    q: "¿Cuantas reservas puedo gestionar?",
    a: "Ilimitadas. No hay limite de reservas en ningun plan.",
  },
]

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 bg-gradient-to-b from-background to-muted text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Reserva<span className="text-primary">Ya</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
          El sistema inteligente de reservas para tu restaurante.
          Tus clientes reservan por WhatsApp con IA y vos gestionas todo desde un panel simple.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/register">Proba 14 dias gratis</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8">
            <Link href="#pricing">Ver precios</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Precio simple, sin sorpresas</h2>
          <PricingToggle />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer font-medium">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ReservaYa. Todos los derechos reservados.
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/pricing-toggle.tsx
git commit -m "feat: add public landing page with hero, features, pricing and FAQ"
```

---

## Task 7: Onboarding Wizard

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create src/app/onboarding/page.tsx**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
]

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Madrid",
]

type OperatingHours = Record<string, { open: string; close: string } | null>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  // Step 1
  const [restaurantName, setRestaurantName] = useState("")
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires")
  const [maxCapacity, setMaxCapacity] = useState("50")
  const [maxPartySize, setMaxPartySize] = useState("20")

  // Fetch current restaurant data on mount
  useEffect(() => {
    fetch("/api/settings/restaurant")
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.name ?? "")
        if (data.timezone) setTimezone(data.timezone)
        if (data.maxCapacity) setMaxCapacity(String(data.maxCapacity))
        if (data.maxPartySize) setMaxPartySize(String(data.maxPartySize))
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  // Step 2
  const [hours, setHours] = useState<OperatingHours>(() => {
    const defaults: OperatingHours = {}
    DAYS.forEach((d) => {
      defaults[d.key] = d.key === "domingo" ? null : { open: "12:00", close: "23:00" }
    })
    return defaults
  })

  function toggleDay(key: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { open: "12:00", close: "23:00" },
    }))
  }

  function updateHour(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key]!, [field]: value } : { open: "12:00", close: "23:00", [field]: value },
    }))
  }

  async function handleFinish() {
    setLoading(true)
    setError("")

    const operatingHours: Record<string, { open: string; close: string }> = {}
    for (const [key, value] of Object.entries(hours)) {
      if (value) operatingHours[key] = value
    }

    try {
      const res = await fetch("/api/settings/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName,
          timezone,
          maxCapacity: Number(maxCapacity),
          maxPartySize: Number(maxPartySize),
          operatingHours,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al guardar")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Configura tu restaurante
          </CardTitle>
          <CardDescription>
            Paso {step} de 3
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidad maxima del restaurante</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximo de personas por reserva</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxPartySize}
                  onChange={(e) => setMaxPartySize(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!ready}>
                {ready ? "Siguiente" : "Cargando..."}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {DAYS.map((day) => (
                <div key={day.key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!hours[day.key]}
                      onChange={() => toggleDay(day.key)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                  {hours[day.key] ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hours[day.key]!.open}
                        onChange={(e) => updateHour(day.key, "open", e.target.value)}
                        className="w-auto"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={hours[day.key]!.close}
                        onChange={(e) => updateHour(day.key, "close", e.target.value)}
                        className="w-auto"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Cerrado</span>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Atras
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p><strong>Zona horaria:</strong> {timezone}</p>
                <p><strong>Capacidad:</strong> {maxCapacity} personas</p>
                <p><strong>Max por reserva:</strong> {maxPartySize} personas</p>
                <p><strong>Dias abiertos:</strong> {Object.entries(hours).filter(([, v]) => v).map(([k]) => k).join(", ") || "Ninguno"}</p>
              </div>
              <Button className="w-full" onClick={handleFinish} disabled={loading}>
                {loading ? "Guardando..." : "Ir al dashboard"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                Modificar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

Note: The onboarding component fetches current restaurant data on mount via `useEffect` to get the real restaurant name (required by the PATCH endpoint) and pre-populate fields.

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: add 3-step onboarding wizard for restaurant setup"
```

---

## Task 8: Email Service (Resend)

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/email-templates/welcome.tsx`
- Create: `src/lib/email-templates/reservation-confirmation.tsx`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/reservations/route.ts`

- [ ] **Step 1: Install dependencies**

Run: `npm install resend @react-email/components`

- [ ] **Step 2: Create src/lib/email.ts**

```typescript
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `ReservaYa <${FROM_EMAIL}>`,
      to,
      subject,
      react,
    })

    if (error) {
      console.error("Email send error:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email send exception:", error)
    return { success: false, error }
  }
}
```

- [ ] **Step 3: Create src/lib/email-templates/welcome.tsx**

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface WelcomeEmailProps {
  name: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenido a ReservaYa</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Bienvenido a ReservaYa
          </Heading>
          <Text>Hola {name},</Text>
          <Text>
            Tu cuenta fue creada exitosamente. Tenes 14 dias de prueba gratuita
            para configurar tu restaurante y empezar a recibir reservas.
          </Text>
          <Section style={{ marginTop: "24px" }}>
            <Text style={{ fontWeight: "bold" }}>Proximos pasos:</Text>
            <Text>1. Configura los horarios de tu restaurante</Text>
            <Text>2. Agrega la informacion para el asistente de IA</Text>
            <Text>3. Conecta tu WhatsApp Business</Text>
          </Section>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — El equipo de ReservaYa
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 4: Create src/lib/email-templates/reservation-confirmation.tsx**

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components"

interface ReservationConfirmationProps {
  customerName: string
  restaurantName: string
  date: string
  time: string
  partySize: number
}

export function ReservationConfirmationEmail({
  customerName,
  restaurantName,
  date,
  time,
  partySize,
}: ReservationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu reserva en {restaurantName}</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Reserva confirmada
          </Heading>
          <Text>Hola {customerName},</Text>
          <Text>Tu reserva en <strong>{restaurantName}</strong> fue confirmada:</Text>
          <Text style={{ background: "#f4f4f5", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
            📅 Fecha: {date}<br />
            🕐 Hora: {time}<br />
            👥 Personas: {partySize}
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            Si necesitas modificar o cancelar tu reserva, contacta al restaurante directamente.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 5: Add welcome email trigger in register route**

In `src/app/api/register/route.ts`, add after the `prisma.restaurant.create` call (before the return):

```typescript
import { sendEmail } from "@/lib/email"
import { WelcomeEmail } from "@/lib/email-templates/welcome"
```

And after the restaurant create:

```typescript
// Send welcome email (non-blocking)
sendEmail({
  to: email,
  subject: "Bienvenido a ReservaYa",
  react: WelcomeEmail({ name }),
}).catch((err) => console.error("Welcome email failed:", err))
```

- [ ] **Step 6: Add confirmation email trigger in reservations route**

In `src/app/api/reservations/route.ts`, add imports:

```typescript
import { sendEmail } from "@/lib/email"
import { ReservationConfirmationEmail } from "@/lib/email-templates/reservation-confirmation"
import { prisma } from "@/lib/prisma"
```

After the `prisma.reservation.create` call in the POST handler, add:

```typescript
// Send confirmation email if customer has email
if (reservation.customerEmail) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { name: true },
  })

  const dateObj = new Date(reservation.dateTime)
  sendEmail({
    to: reservation.customerEmail,
    subject: `Tu reserva en ${restaurant?.name ?? "el restaurante"}`,
    react: ReservationConfirmationEmail({
      customerName: reservation.customerName,
      restaurantName: restaurant?.name ?? "el restaurante",
      date: dateObj.toLocaleDateString("es-AR"),
      time: dateObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      partySize: reservation.partySize,
    }),
  }).catch((err) => console.error("Confirmation email failed:", err))
}
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add src/lib/email.ts src/lib/email-templates/ src/app/api/register/route.ts src/app/api/reservations/route.ts
git commit -m "feat: add transactional emails with Resend (welcome + reservation confirmation)"
```

---

## Task 9: Update Middleware Matcher + Final Wiring

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update middleware matcher to exclude webhook**

In `src/middleware.ts`, update the matcher to exclude the MercadoPago webhook:

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

The current matcher already excludes `/api/*` routes, so the webhook at `/api/webhooks/mercadopago` is already exempt. No change needed to the matcher.

Verify this is correct — the billing gate runs in the `authorized` callback in `auth.config.ts`, not in `middleware.ts`, so API routes are handled by their own auth checks.

- [ ] **Step 2: Final type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete Fase 1 — billing, landing, onboarding, email"
```

---

## Environment Variables Summary

Add to `.env` and Vercel:

```
MERCADOPAGO_ACCESS_TOKEN=       # MercadoPago access token
MERCADOPAGO_PUBLIC_KEY=         # MercadoPago public key (optional, for frontend)
MERCADOPAGO_WEBHOOK_SECRET=     # MercadoPago webhook secret
RESEND_API_KEY=                 # Resend API key
RESEND_FROM_EMAIL=              # Sender email (optional, defaults to onboarding@resend.dev)
```
