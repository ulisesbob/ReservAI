# Fase 1 — Monetización y Deploy

## Resumen

Implementar el flujo completo de monetización de ReservaYa: billing con MercadoPago, landing page pública con pricing, onboarding wizard post-registro, y emails transaccionales con Resend. Todo se deploya junto al final.

## Decisiones de Diseño

- **Pasarela de pago:** MercadoPago (mercado argentino, ARS directo)
- **Plan único:** todo incluido, sin tiers
- **Pricing:** $25.000 ARS/mes o $240.000 ARS/año (20% descuento)
- **Trial:** 14 días con funcionalidad completa
- **Checkout:** hosted por MercadoPago (no embebido)
- **Email:** Resend + React Email
- **Emails en esta fase:** bienvenida + confirmación de reserva

## 1. Modelo de Datos

### Nuevos Enums

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

### Nuevo Modelo: Subscription

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

### Nuevo Modelo: Payment

```prisma
model Payment {
  id                   String        @id @default(cuid())
  subscriptionId       String
  amount               Decimal       @db.Decimal(12,2) // ARS pesos (no centavos), ej: 25000.00
  currency             String        @default("ARS")
  status               PaymentStatus @default(PENDING)
  mercadoPagoPaymentId String?       @unique
  paidAt               DateTime?
  createdAt            DateTime      @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
}
```

### Cambios en Restaurant

```prisma
model Restaurant {
  // ... campos existentes ...
  email        String?       // email del restaurante (remitente emails)
  subscription Subscription?
}
```

## 2. Integración MercadoPago

### Flujo de Suscripción

1. Usuario va a `/settings/billing` (o banner de trial vencido)
2. Elige plan mensual ($25.000) o anual ($240.000)
3. Backend crea una preferencia de pago via API de MercadoPago
4. Usuario redirigido al checkout hosted de MercadoPago
5. Paga con tarjeta, transferencia, etc.
6. MercadoPago redirige de vuelta a `/settings/billing?status=approved`
7. Webhook confirma el pago y actualiza Subscription

### Checkout Hosted

Se usa el checkout hosted de MercadoPago (no embebido). Razones:
- Menos código
- MercadoPago maneja toda la UI de pago
- Cumple PCI sin esfuerzo
- Soporta todos los medios de pago argentinos out-of-the-box

### Pagos Recurrentes

MercadoPago tiene API de suscripciones (`preapproval`). Se crea una suscripción con `auto_recurring` y MP cobra automáticamente cada mes/año. El webhook notifica cada cobro.

### Webhook `/api/webhooks/mercadopago`

- **Ruta:** `POST /api/webhooks/mercadopago`
- **Validación:** firma HMAC de MercadoPago
- **Eventos manejados:**
  - `payment.created` / `payment.updated` → crear/actualizar Payment
  - `subscription_preapproval.updated` → actualizar Subscription.status
- **Lógica:**
  - Pago aprobado → `Subscription.status = ACTIVE`, `Payment.status = APPROVED`
  - Pago rechazado → `Subscription.status = PAST_DUE`, `Payment.status = REJECTED`
  - Suscripción cancelada → `Subscription.status = CANCELLED`

### Archivos

- `src/lib/mercadopago.ts` — cliente MP, crear preferencia, crear suscripción
- `src/app/api/webhooks/mercadopago/route.ts` — webhook handler
- `src/app/settings/billing/page.tsx` — página de billing
- `src/app/api/settings/billing/route.ts` — API para crear/cambiar suscripción

### Variables de Entorno

- `MERCADOPAGO_ACCESS_TOKEN` — token de acceso de MP
- `MERCADOPAGO_PUBLIC_KEY` — clave pública (para frontend si se necesita)
- `MERCADOPAGO_WEBHOOK_SECRET` — secreto para validar webhooks

## 3. Middleware de Billing

Control de acceso según estado de suscripción:

| Estado | Acceso |
|--------|--------|
| `TRIALING` (dentro de fecha) | Completo |
| `ACTIVE` | Completo |
| `TRIALING` (vencido) | Solo `/settings/billing` |
| `PAST_DUE` | Solo `/settings/billing` |
| `CANCELLED` | Solo `/settings/billing` |

**Rutas siempre accesibles** (sin importar estado de suscripción):
- `/` (landing)
- `/login`, `/register`
- `/settings/billing`
- `/api/webhooks/mercadopago`
- `/onboarding`

**Implementación:** Se extiende el middleware existente (`src/middleware.ts`). Después de verificar auth, consulta el estado de la suscripción. Si está vencida/cancelada, redirige a `/settings/billing`.

Nota: el middleware de Next.js corre en Edge Runtime y no puede hacer queries a Prisma directamente. La verificación se hace via la sesión JWT (agregar `subscriptionStatus` y `trialEndsAt` al token JWT).

### Estrategia de Refresco del JWT

El JWT se emite al login y no se actualiza solo. Si el trial vence o un webhook cambia el estado de la suscripción mid-sesión, el JWT queda desactualizado. Para resolver esto:

- **JWT `maxAge` corto:** configurar `session: { strategy: "jwt", maxAge: 3600 }` (1 hora) en NextAuth. Esto fuerza re-evaluación frecuente.
- **Refresh en callbacks:** en el callback `jwt` de NextAuth, si el token tiene más de 5 minutos, consultar DB para refrescar `subscriptionStatus` y `trialEndsAt`.
- **Refresh post-webhook:** cuando el webhook de MercadoPago actualiza una suscripción, no se puede invalidar el JWT directamente, pero el maxAge corto garantiza que el usuario verá el cambio en menos de 1 hora.

Esto evita que un usuario con trial vencido siga accediendo simplemente por tener una sesión abierta.

## 4. Landing Page Pública

Reemplaza la landing actual en `src/app/page.tsx`.

### Secciones

1. **Hero** — título, subtítulo, CTA "Probá 14 días gratis"
2. **Features** — 3-4 cards:
   - Reservas por WhatsApp con IA
   - Panel de gestión intuitivo
   - Configuración en minutos
   - Multi-usuario (admin + empleados)
3. **Pricing** — una card con toggle mensual/anual:
   - Mensual: $25.000/mes
   - Anual: $240.000/año (ahorrá 20%)
   - Lista de todo lo incluido
   - CTA "Empezar trial gratis"
4. **FAQ** — 4-5 preguntas:
   - ¿Qué pasa al terminar el trial?
   - ¿Puedo cancelar en cualquier momento?
   - ¿Qué medios de pago aceptan?
   - ¿Necesito un número de WhatsApp Business?
   - ¿Cuántas reservas puedo gestionar?
5. **Footer** — links básicos, copyright

### Comportamiento

- Si el usuario ya está logueado → redirige a `/dashboard` (como ahora)
- Si no → muestra la landing completa

## 5. Onboarding Wizard

### Ruta

`/onboarding` — protegida por auth.

### Flujo

**Paso 1 — Datos del restaurante:**
- Timezone (ya viene del registro pero puede editarse)
- Capacidad máxima
- Tamaño máximo de grupo

**Paso 2 — Horarios de atención:**
- Selector de días (lunes a domingo)
- Horario de apertura y cierre por día
- Posibilidad de marcar días como cerrado

**Paso 3 — Listo:**
- Resumen de lo configurado
- Botón "Ir al dashboard"
- Link secundario: "Configurar WhatsApp después"

### Detección

El middleware detecta si el restaurante no tiene `operatingHours` configurados. Si no los tiene y el usuario intenta ir al dashboard → redirige a `/onboarding`. Una vez completado, no vuelve a aparecer.

Se agrega un flag en el JWT: `onboardingCompleted` (derivado de si `operatingHours` existe).

### Implementación

- `src/app/onboarding/page.tsx` — componente con estado local para los 3 pasos
- Al finalizar, hace PATCH a `/api/settings/restaurant` (endpoint existente, solo exporta GET y PATCH)

## 6. Email Transaccional

### Servicio

`src/lib/email.ts` — wrapper de Resend SDK.

### Templates

Usando React Email. Archivos en `src/lib/email-templates/`:

- `welcome.tsx` — email de bienvenida
- `reservation-confirmation.tsx` — confirmación de reserva

### Email de Bienvenida

- **Trigger:** al completar registro (`/api/register`)
- **Destinatario:** email del admin
- **Asunto:** "Bienvenido a ReservaYa"
- **Contenido:** nombre, que tiene 14 días de trial, link al onboarding

### Email de Confirmación de Reserva

- **Trigger:** al crear una reserva (manual o WhatsApp) si el cliente tiene email
- **Destinatario:** email del cliente (`customerEmail`)
- **Asunto:** "Tu reserva en {restaurante}"
- **Contenido:** fecha, hora, cantidad de personas, nombre del restaurante
- **Remitente:** email del restaurante (campo nuevo) o fallback a `onboarding@resend.dev` (dominio de prueba de Resend). En producción, se requiere registrar y verificar DNS de un dominio propio (ej: `reservaya.com`) en Resend para usar un remitente personalizado.

### Variables de Entorno

- `RESEND_API_KEY`

## 7. Orden de Implementación

1. **Modelos** — Subscription, Payment, campo email en Restaurant, migración. Actualizar `/api/register` para crear `Subscription` con `status: TRIALING` y `trialEndsAt: now() + 14 días` atómicamente con el Restaurant (nested create o `$transaction`)
2. **MercadoPago** — lib, webhook, API de billing
3. **Middleware billing** — JWT extendido, control de acceso por suscripción
4. **Landing page** — hero, features, pricing, FAQ, footer
5. **Onboarding** — wizard 3 pasos, detección en middleware
6. **Email** — Resend setup, templates, triggers en registro y reservas
7. **Deploy** — variables de entorno en Vercel, deploy final

## 8. Dependencias Nuevas

```
mercadopago        — SDK oficial de MercadoPago
resend             — SDK de Resend
@react-email/*     — componentes de React Email
```
