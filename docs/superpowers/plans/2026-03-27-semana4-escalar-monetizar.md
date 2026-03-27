# Semana 4 — Escalar y Monetizar: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 features: i18n multi-idioma, billing portal self-service, Sentry + GitHub Actions CI/CD, and revenue analytics (MRR, churn, LTV).

**Architecture:** i18n uses next-intl for route-based locale switching (es/en/pt). Billing portal extends existing MercadoPago integration. CI/CD adds GitHub Actions for lint+build+test. Revenue analytics adds new API endpoint + dashboard page.

**Tech Stack:** Next.js 14, Prisma 7.5, PostgreSQL, MercadoPago SDK, next-intl, @sentry/nextjs, GitHub Actions

**Project root:** `C:/Users/Ulise/Desktop/z/saas para reserva de clientes/`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install next-intl and @sentry/nextjs**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npm install next-intl @sentry/nextjs
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add package.json package-lock.json && git commit -m "chore: add next-intl and @sentry/nextjs dependencies"
```

---

## Task 2: i18n Setup — next-intl Configuration

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/messages/es.json`
- Create: `src/i18n/messages/en.json`
- Create: `src/i18n/messages/pt.json`
- Create: `src/i18n/request.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Create i18n config**

Create `src/i18n/config.ts`:

```typescript
export const locales = ["es", "en", "pt"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "es"

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
}
```

- [ ] **Step 2: Create Spanish messages (base language)**

Create `src/i18n/messages/es.json`:

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "back": "Atrás",
    "next": "Siguiente",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "confirm": "Confirmar",
    "close": "Cerrar",
    "search": "Buscar",
    "noResults": "Sin resultados",
    "persons": "personas"
  },
  "nav": {
    "reservations": "Reservas",
    "analytics": "Analytics",
    "customers": "Clientes",
    "waitlist": "Lista de espera",
    "chats": "Chats",
    "settings": "Configuración"
  },
  "auth": {
    "login": "Iniciar sesión",
    "register": "Crear cuenta",
    "logout": "Cerrar sesión",
    "email": "Email",
    "password": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "name": "Nombre"
  },
  "dashboard": {
    "title": "Dashboard",
    "todayReservations": "Reservas de hoy",
    "confirmed": "Confirmadas",
    "totalGuests": "Comensales"
  },
  "reservations": {
    "title": "Reservas",
    "new": "Nueva reserva",
    "customer": "Cliente",
    "phone": "Teléfono",
    "dateTime": "Fecha/Hora",
    "partySize": "Personas",
    "status": "Estado",
    "pending": "Pendiente",
    "confirmed": "Confirmada",
    "cancelled": "Cancelada",
    "completed": "Completada"
  },
  "waitlist": {
    "title": "Lista de espera",
    "waiting": "Esperando",
    "notified": "Notificado",
    "expired": "Expirado",
    "peopleWaiting": "{count, plural, one {# persona esperando} other {# personas esperando}}"
  },
  "chats": {
    "title": "Chats escalados",
    "subtitle": "Conversaciones que necesitan atención humana",
    "noChats": "No hay chats escalados",
    "resolve": "Resolver",
    "sendMessage": "Escribí un mensaje...",
    "requestedHuman": "Pidió hablar con humano",
    "botUnresolved": "Bot no pudo resolver"
  },
  "billing": {
    "title": "Facturación",
    "subtitle": "Gestioná tu suscripción y pagos",
    "currentPlan": "Plan actual",
    "changePlan": "Cambiar plan",
    "cancelSubscription": "Cancelar suscripción",
    "confirmCancel": "¿Seguro que querés cancelar tu suscripción?",
    "monthly": "Mensual",
    "yearly": "Anual",
    "trial": "Período de prueba",
    "trialEnds": "Tu prueba termina el {date}",
    "active": "Activa",
    "pastDue": "Pago pendiente",
    "cancelled": "Cancelada",
    "paymentHistory": "Historial de pagos",
    "amount": "Monto",
    "date": "Fecha",
    "status": "Estado",
    "viewPortal": "Ver portal de facturación",
    "managePlan": "Gestionar plan",
    "perMonth": "/mes",
    "perYear": "/año",
    "save": "Ahorrá {amount}"
  },
  "analytics": {
    "title": "Analytics",
    "revenue": "Revenue",
    "mrr": "MRR",
    "churn": "Churn",
    "ltv": "LTV",
    "activeSubscriptions": "Suscripciones activas",
    "totalRevenue": "Revenue total",
    "period": "Período"
  },
  "settings": {
    "restaurant": "Restaurante",
    "whatsapp": "WhatsApp",
    "knowledgeBase": "Base de conocimiento",
    "account": "Mi cuenta",
    "team": "Equipo",
    "billing": "Facturación",
    "language": "Idioma"
  }
}
```

- [ ] **Step 3: Create English messages**

Create `src/i18n/messages/en.json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "next": "Next",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "close": "Close",
    "search": "Search",
    "noResults": "No results",
    "persons": "people"
  },
  "nav": {
    "reservations": "Reservations",
    "analytics": "Analytics",
    "customers": "Customers",
    "waitlist": "Waitlist",
    "chats": "Chats",
    "settings": "Settings"
  },
  "auth": {
    "login": "Sign in",
    "register": "Create account",
    "logout": "Sign out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "name": "Name"
  },
  "dashboard": {
    "title": "Dashboard",
    "todayReservations": "Today's reservations",
    "confirmed": "Confirmed",
    "totalGuests": "Total guests"
  },
  "reservations": {
    "title": "Reservations",
    "new": "New reservation",
    "customer": "Customer",
    "phone": "Phone",
    "dateTime": "Date/Time",
    "partySize": "Party size",
    "status": "Status",
    "pending": "Pending",
    "confirmed": "Confirmed",
    "cancelled": "Cancelled",
    "completed": "Completed"
  },
  "waitlist": {
    "title": "Waitlist",
    "waiting": "Waiting",
    "notified": "Notified",
    "expired": "Expired",
    "peopleWaiting": "{count, plural, one {# person waiting} other {# people waiting}}"
  },
  "chats": {
    "title": "Escalated chats",
    "subtitle": "Conversations that need human attention",
    "noChats": "No escalated chats",
    "resolve": "Resolve",
    "sendMessage": "Type a message...",
    "requestedHuman": "Requested human",
    "botUnresolved": "Bot couldn't resolve"
  },
  "billing": {
    "title": "Billing",
    "subtitle": "Manage your subscription and payments",
    "currentPlan": "Current plan",
    "changePlan": "Change plan",
    "cancelSubscription": "Cancel subscription",
    "confirmCancel": "Are you sure you want to cancel your subscription?",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "trial": "Trial period",
    "trialEnds": "Your trial ends on {date}",
    "active": "Active",
    "pastDue": "Past due",
    "cancelled": "Cancelled",
    "paymentHistory": "Payment history",
    "amount": "Amount",
    "date": "Date",
    "status": "Status",
    "viewPortal": "View billing portal",
    "managePlan": "Manage plan",
    "perMonth": "/month",
    "perYear": "/year",
    "save": "Save {amount}"
  },
  "analytics": {
    "title": "Analytics",
    "revenue": "Revenue",
    "mrr": "MRR",
    "churn": "Churn",
    "ltv": "LTV",
    "activeSubscriptions": "Active subscriptions",
    "totalRevenue": "Total revenue",
    "period": "Period"
  },
  "settings": {
    "restaurant": "Restaurant",
    "whatsapp": "WhatsApp",
    "knowledgeBase": "Knowledge base",
    "account": "My account",
    "team": "Team",
    "billing": "Billing",
    "language": "Language"
  }
}
```

- [ ] **Step 4: Create Portuguese messages**

Create `src/i18n/messages/pt.json` — same structure as en.json but translated to Portuguese (Brasil).

- [ ] **Step 5: Create request config for next-intl**

Create `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, locales, type Locale } from "./config"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get("locale")?.value as Locale | undefined
  const locale = localeCookie && locales.includes(localeCookie) ? localeCookie : defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 6: Create API endpoint to change locale**

Create `src/app/api/locale/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { locales } from "@/i18n/config"

export async function POST(request: NextRequest) {
  const { locale } = await request.json()

  if (!locales.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  })

  return response
}
```

- [ ] **Step 7: Create language switcher component**

Create `src/components/language-switcher.tsx`:

```typescript
"use client"

import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locales, localeNames, type Locale } from "@/i18n/config"

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()

  async function handleChange(locale: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    })
    router.refresh()
  }

  return (
    <Select value={currentLocale} onValueChange={(v) => handleChange(v as Locale)}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 8: Add NextIntlClientProvider to root layout**

Modify `src/app/layout.tsx` to wrap children with NextIntlClientProvider:

```typescript
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
```

In the RootLayout function, before return:
```typescript
  const locale = await getLocale()
  const messages = await getMessages()
```

Wrap children:
```tsx
<html lang={locale}>
  ...
  <NextIntlClientProvider messages={messages}>
    {children}
  </NextIntlClientProvider>
</html>
```

- [ ] **Step 9: Add next-intl plugin to next.config.mjs**

Add to `next.config.mjs`:
```javascript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// wrap existing config
export default withNextIntl(nextConfig)
```

- [ ] **Step 10: Add language switcher to dashboard nav**

In `src/app/dashboard/dashboard-nav.tsx`, add the LanguageSwitcher component next to the user dropdown, getting the current locale from a cookie or defaulting to "es".

- [ ] **Step 11: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: add i18n multi-language support (es/en/pt) with next-intl"
```

---

## Task 3: Billing Portal Self-Service

**Files:**
- Create: `src/app/api/settings/billing/cancel/route.ts`
- Create: `src/app/api/settings/billing/change-plan/route.ts`
- Modify: `src/app/settings/billing/billing-form.tsx`

- [ ] **Step 1: Create cancel subscription endpoint**

Create `src/app/api/settings/billing/cancel/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago"

export async function POST() {
  try {
    const session = await requireAdmin()

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
    })

    if (!subscription) {
      return NextResponse.json({ error: "No hay suscripción activa" }, { status: 404 })
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json({ error: "La suscripción ya está cancelada" }, { status: 400 })
    }

    // Cancel in MercadoPago if there's an active subscription
    if (subscription.mercadoPagoSubscriptionId) {
      try {
        const mp = getMercadoPagoClient()
        await mp.preApproval.update({
          id: subscription.mercadoPagoSubscriptionId,
          body: { status: "cancelled" },
        })
      } catch (error) {
        console.error("MercadoPago cancellation error:", error)
        // Continue with local cancellation even if MP fails
      }
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create change plan endpoint**

Create `src/app/api/settings/billing/change-plan/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createSubscription, PLANS } from "@/lib/mercadopago"

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const { plan } = await request.json()

    if (!plan || !["MONTHLY", "YEARLY"].includes(plan)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
    })

    if (!subscription) {
      return NextResponse.json({ error: "No hay suscripción" }, { status: 404 })
    }

    if (subscription.plan === plan) {
      return NextResponse.json({ error: "Ya estás en este plan" }, { status: 400 })
    }

    // Create new subscription in MercadoPago
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { name: true },
    })

    const mpSubscription = await createSubscription({
      plan: plan as "MONTHLY" | "YEARLY",
      restaurantName: restaurant?.name || "Restaurant",
      restaurantId: session.restaurantId,
    })

    // Update local subscription plan
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        mercadoPagoSubscriptionId: mpSubscription.id || subscription.mercadoPagoSubscriptionId,
      },
    })

    return NextResponse.json({
      success: true,
      redirectUrl: mpSubscription.init_point,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Change plan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Update billing form with self-service UI**

Modify `src/app/settings/billing/billing-form.tsx` to add:
- Current plan display with status badge
- "Cambiar plan" button that shows plan options (Monthly/Yearly) with pricing
- "Cancelar suscripción" button with confirmation dialog
- Payment history table (already exists, improve if needed)
- Plan comparison cards showing prices and features
- Handle trial state, active state, and cancelled state differently

The component should call `/api/settings/billing/cancel` and `/api/settings/billing/change-plan` endpoints.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: add billing portal self-service (change plan, cancel subscription)"
```

---

## Task 4: Sentry Error Monitoring Setup

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.mjs`
- Modify: `src/app/global-error.tsx`

- [ ] **Step 1: Create Sentry client config**

Create `sentry.client.config.ts` at project root:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
})
```

- [ ] **Step 2: Create Sentry server config**

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
})
```

- [ ] **Step 3: Create Sentry edge config**

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
})
```

- [ ] **Step 4: Add Sentry to next.config.mjs**

Wrap the config with `withSentryConfig`:

```javascript
import { withSentryConfig } from "@sentry/nextjs"

// After existing withNextIntl wrapper:
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
```

- [ ] **Step 5: Create global error page**

Create or modify `src/app/global-error.tsx`:

```typescript
"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Algo salió mal</h2>
          <p className="text-muted-foreground">Estamos trabajando en solucionarlo.</p>
          <Button onClick={reset}>Intentar de nuevo</Button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: add Sentry error monitoring configuration"
```

---

## Task 5: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  NEXTAUTH_SECRET: "ci-test-secret"
  ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

jobs:
  lint-and-build:
    name: Lint & Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add .github/ && git commit -m "feat: add GitHub Actions CI/CD pipeline (lint, typecheck, build)"
```

---

## Task 6: Revenue Analytics — Database and API

**Files:**
- Create: `src/app/api/analytics/revenue/route.ts`

- [ ] **Step 1: Create revenue analytics endpoint**

Create `src/app/api/analytics/revenue/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const { searchParams } = request.nextUrl
    const period = searchParams.get("period") || "30" // days

    const days = Math.min(Number(period), 365)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all subscriptions with payments
    const subscriptions = await prisma.subscription.findMany({
      select: {
        id: true,
        plan: true,
        status: true,
        createdAt: true,
        restaurant: { select: { name: true } },
        payments: {
          where: { status: "APPROVED", paidAt: { gte: startDate } },
          orderBy: { paidAt: "desc" },
        },
      },
    })

    // Calculate MRR
    const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE")
    const mrr = activeSubscriptions.reduce((sum, s) => {
      if (s.plan === "MONTHLY") return sum + 250
      if (s.plan === "YEARLY") return sum + 2400 / 12 // Monthly equivalent
      return sum
    }, 0)

    // Calculate total revenue in period
    const allPayments = subscriptions.flatMap((s) => s.payments)
    const totalRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Calculate churn
    const cancelledInPeriod = subscriptions.filter(
      (s) => s.status === "CANCELLED"
    ).length
    const totalEver = subscriptions.length
    const churnRate = totalEver > 0 ? (cancelledInPeriod / totalEver) * 100 : 0

    // Calculate LTV (simplified: average revenue per customer / churn rate)
    const avgRevenuePerCustomer = totalEver > 0 ? totalRevenue / totalEver : 0
    const monthlyChurnRate = churnRate / 100
    const ltv = monthlyChurnRate > 0 ? avgRevenuePerCustomer / monthlyChurnRate : avgRevenuePerCustomer * 12

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

      const monthPayments = allPayments.filter((p) => {
        if (!p.paidAt) return false
        return p.paidAt >= monthStart && p.paidAt <= monthEnd
      })

      revenueByMonth.push({
        month: monthKey,
        revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        count: monthPayments.length,
      })
    }

    // Subscription status breakdown
    const statusBreakdown = {
      active: subscriptions.filter((s) => s.status === "ACTIVE").length,
      trialing: subscriptions.filter((s) => s.status === "TRIALING").length,
      pastDue: subscriptions.filter((s) => s.status === "PAST_DUE").length,
      cancelled: subscriptions.filter((s) => s.status === "CANCELLED").length,
    }

    // Plan breakdown
    const planBreakdown = {
      monthly: activeSubscriptions.filter((s) => s.plan === "MONTHLY").length,
      yearly: activeSubscriptions.filter((s) => s.plan === "YEARLY").length,
    }

    return NextResponse.json({
      mrr: Math.round(mrr),
      totalRevenue: Math.round(totalRevenue),
      churnRate: Math.round(churnRate * 10) / 10,
      ltv: Math.round(ltv),
      activeCount: activeSubscriptions.length,
      totalCount: totalEver,
      revenueByMonth,
      statusBreakdown,
      planBreakdown,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/api/analytics/ && git commit -m "feat: add revenue analytics API (MRR, churn, LTV, breakdown)"
```

---

## Task 7: Revenue Analytics — Dashboard Page

**Files:**
- Create: `src/app/dashboard/analytics/revenue/page.tsx`

- [ ] **Step 1: Create revenue analytics page**

Create `src/app/dashboard/analytics/revenue/page.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react"

interface RevenueData {
  mrr: number
  totalRevenue: number
  churnRate: number
  ltv: number
  activeCount: number
  totalCount: number
  revenueByMonth: { month: string; revenue: number; count: number }[]
  statusBreakdown: { active: number; trialing: number; pastDue: number; cancelled: number }
  planBreakdown: { monthly: number; yearly: number }
}

export default function RevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [period, setPeriod] = useState("90")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/revenue?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  if (loading || !data) {
    return <div className="mx-auto max-w-6xl px-4 py-8"><p className="text-muted-foreground">Cargando...</p></div>
  }

  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">Métricas de monetización y suscripciones</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
            <SelectItem value="180">6 meses</SelectItem>
            <SelectItem value="365">1 año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />MRR
            </div>
            <p className="text-2xl font-bold">${data.mrr.toLocaleString()} ARS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />Revenue Total
            </div>
            <p className="text-2xl font-bold">${data.totalRevenue.toLocaleString()} ARS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="w-4 h-4" />Churn Rate
            </div>
            <p className="text-2xl font-bold">{data.churnRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />LTV
            </div>
            <p className="text-2xl font-bold">${data.ltv.toLocaleString()} ARS</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue por mes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.revenueByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-20">{m.month}</span>
                <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-md transition-all"
                    style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-28 text-right">${m.revenue.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground w-16">{m.count} pagos</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Estado de suscripciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Activas</span>
              <Badge variant="default">{data.statusBreakdown.active}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">En prueba</span>
              <Badge variant="secondary">{data.statusBreakdown.trialing}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pago pendiente</span>
              <Badge variant="destructive">{data.statusBreakdown.pastDue}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Canceladas</span>
              <Badge variant="outline">{data.statusBreakdown.cancelled}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Distribución de planes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Mensual ($250/mes)</span>
              <Badge>{data.planBreakdown.monthly}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Anual ($2.400/año)</span>
              <Badge>{data.planBreakdown.yearly}</Badge>
            </div>
            <div className="pt-2 border-t text-sm text-muted-foreground">
              Total activas: {data.activeCount} de {data.totalCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add link to revenue analytics from main analytics page**

In `src/app/dashboard/analytics/page.tsx`, add a link/button at the top that says "Ver Revenue Analytics" pointing to `/dashboard/analytics/revenue`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: add revenue analytics dashboard (MRR, churn, LTV, charts)"
```

---

## Task 8: Build and Verify

- [ ] **Step 1: Run prisma generate**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npx prisma generate
```

- [ ] **Step 2: Run build**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npm run build
```

- [ ] **Step 3: Fix any build errors**

- [ ] **Step 4: Final commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: Semana 4 complete — i18n, billing portal, Sentry, revenue analytics"
```
