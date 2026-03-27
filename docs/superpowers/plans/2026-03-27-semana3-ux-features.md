# Semana 3 — UX Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 UX features: Waitlist, improved Onboarding, WhatsApp escalation to human, and WhatsApp cancellations.

**Architecture:** Each feature is independent. Tasks are ordered by dependencies: DB schema first, then shared utilities, then backend APIs, then frontend, then WhatsApp bot integration. The waitlist notification system is a shared utility used by both cancellation flows (dashboard + WhatsApp).

**Tech Stack:** Next.js 14, Prisma 7.5, PostgreSQL, OpenAI gpt-4o-mini (function calling), Meta WhatsApp Cloud API, shadcn/ui, Zod, date-fns.

**Project root:** `C:/Users/Ulise/Desktop/z/saas para reserva de clientes/`

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `src/lib/waitlist.ts` | Waitlist notification logic (find next, notify, expire) |
| `src/app/api/waitlist/route.ts` | GET (list) + POST (join) waitlist |
| `src/app/api/waitlist/[id]/route.ts` | DELETE (remove from waitlist) |
| `src/app/api/conversations/escalated/route.ts` | GET escalated conversations |
| `src/app/api/conversations/[id]/messages/route.ts` | GET conversation messages |
| `src/app/api/conversations/[id]/reply/route.ts` | POST staff reply via WhatsApp |
| `src/app/api/conversations/[id]/resolve/route.ts` | POST close escalated conversation |
| `src/app/dashboard/waitlist/page.tsx` | Waitlist dashboard page |
| `src/app/dashboard/chats/page.tsx` | Escalated chats list page |
| `src/app/dashboard/chats/[id]/page.tsx` | Individual chat view page |
| `src/components/onboarding/step-whatsapp.tsx` | Onboarding step 3: WhatsApp config |
| `src/components/onboarding/step-knowledge.tsx` | Onboarding step 4: Knowledge base |
| `src/components/onboarding/step-confirmation.tsx` | Onboarding step 5: Summary + links |

### Modify
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add WaitlistEntry model, WaitlistStatus enum, ESCALATED to ConversationStatus, onboardingStep to Restaurant, escalation fields to Conversation |
| `src/lib/schemas.ts` | Add waitlist Zod schema |
| `src/lib/ai-agent.ts` | Add `buscar_reservas` + `cancelar_reserva` tools, escalation detection in system prompt |
| `src/app/api/whatsapp/webhook/route.ts` | Handle waitlist responses, escalated conversations, cancellation tools |
| `src/app/api/reservations/[id]/route.ts` | Trigger waitlist notification on CANCELLED status |
| `src/app/api/book/[slug]/route.ts` | Return waitlist option when unavailable |
| `src/app/onboarding/page.tsx` | Extend to 5 steps, add onboardingStep persistence |
| `src/app/dashboard/dashboard-nav.tsx` | Add "Lista de espera" and "Chats" nav links with badges |

---

## Task 1: Database Schema — New models and fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add WaitlistStatus enum and WaitlistEntry model**

Add after `PaymentStatus` enum:

```prisma
enum WaitlistStatus {
  WAITING
  NOTIFIED
  CONFIRMED
  EXPIRED
  CANCELLED
}
```

Add after `Payment` model:

```prisma
model WaitlistEntry {
  id             String         @id @default(cuid())
  restaurantId   String
  restaurant     Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  customerName   String
  customerPhone  String
  customerEmail  String?
  dateTime       DateTime
  partySize      Int
  status         WaitlistStatus @default(WAITING)
  notifiedAt     DateTime?
  expiresAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([restaurantId, dateTime, status])
  @@index([restaurantId, status])
}
```

- [ ] **Step 2: Add ESCALATED to ConversationStatus and fields to Conversation**

Update `ConversationStatus` enum:

```prisma
enum ConversationStatus {
  ACTIVE
  COMPLETED
  EXPIRED
  ESCALATED
}
```

Add to `Conversation` model (after `updatedAt`):

```prisma
  escalatedAt     DateTime?
  escalatedReason String?
```

- [ ] **Step 3: Add onboardingStep to Restaurant and waitlistEntries relation**

Add to `Restaurant` model (after `email`):

```prisma
  onboardingStep  Int      @default(0)
```

Add to `Restaurant` relations (after `subscription`):

```prisma
  waitlistEntries WaitlistEntry[]
```

- [ ] **Step 4: Run migration**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npx prisma migrate dev --name semana3-waitlist-escalation-onboarding
```

Expected: Migration created and applied successfully.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add prisma/schema.prisma prisma/migrations/ src/generated/ && git commit -m "feat: add WaitlistEntry model, ESCALATED status, onboardingStep field"
```

---

## Task 2: Zod Schemas for Waitlist

**Files:**
- Modify: `src/lib/schemas.ts`

- [ ] **Step 1: Add waitlist schemas**

Add after `billingSchema`:

```typescript
// ─── Waitlist schemas ────────────────────────────────────────────────────────

export const waitlistCreateSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID es requerido"),
  customerName: z.string().min(1, "Nombre es requerido").max(200),
  customerPhone: z.string().min(1, "Teléfono es requerido").max(30),
  customerEmail: z.string().email("Email inválido").max(255).nullish().or(z.literal("")),
  dateTime: z.string().min(1, "Fecha/hora es requerida"),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 persona"),
})
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/lib/schemas.ts && git commit -m "feat: add waitlist Zod validation schema"
```

---

## Task 3: Waitlist Notification Utility

**Files:**
- Create: `src/lib/waitlist.ts`

- [ ] **Step 1: Create waitlist notification logic**

```typescript
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"

/**
 * Find the next WAITING entry for a given restaurant/time window and notify them.
 * Called when a reservation is cancelled to offer the spot to the next person.
 */
export async function notifyNextInWaitlist(
  restaurantId: string,
  dateTime: Date,
  freedCapacity: number
): Promise<void> {
  // Find restaurant for WhatsApp config
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      whatsappPhoneId: true,
      whatsappToken: true,
      timezone: true,
    },
  })

  if (!restaurant?.whatsappPhoneId || !restaurant?.whatsappToken) return

  // Find next WAITING entry in a 2-hour window around the freed time
  const windowStart = new Date(dateTime.getTime() - 60 * 60 * 1000)
  const windowEnd = new Date(dateTime.getTime() + 60 * 60 * 1000)

  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: {
      restaurantId,
      status: "WAITING",
      dateTime: { gte: windowStart, lte: windowEnd },
      partySize: { lte: freedCapacity },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!nextEntry) return

  // Update entry status to NOTIFIED with 15-minute expiry
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.waitlistEntry.update({
    where: { id: nextEntry.id },
    data: {
      status: "NOTIFIED",
      notifiedAt: new Date(),
      expiresAt,
    },
  })

  // Format date/time for message
  const dateStr = dateTime.toLocaleDateString("es-AR", {
    timeZone: restaurant.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const timeStr = dateTime.toLocaleTimeString("es-AR", {
    timeZone: restaurant.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const message =
    `🎉 ¡Se liberó un lugar en ${restaurant.name}!\n\n` +
    `📅 ${dateStr} a las ${timeStr}\n` +
    `👥 ${nextEntry.partySize} personas\n\n` +
    `¿Querés confirmar tu reserva? Tenés 15 minutos para responder.\n` +
    `Respondé *SÍ* para confirmar o *NO* para cancelar.`

  const decryptedToken = safeDecrypt(restaurant.whatsappToken)
  await sendWhatsAppMessage(
    restaurant.whatsappPhoneId,
    decryptedToken,
    nextEntry.customerPhone,
    message
  )
}

/**
 * Expire NOTIFIED waitlist entries that have passed their 15-minute window.
 * Then notify the next person in line.
 */
export async function expireAndNotifyNext(restaurantId: string): Promise<void> {
  const expired = await prisma.waitlistEntry.findMany({
    where: {
      restaurantId,
      status: "NOTIFIED",
      expiresAt: { lt: new Date() },
    },
  })

  for (const entry of expired) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "EXPIRED" },
    })

    // Notify next person for the same time slot
    await notifyNextInWaitlist(restaurantId, entry.dateTime, entry.partySize)
  }
}

/**
 * Confirm a waitlist entry — create the reservation and mark as CONFIRMED.
 */
export async function confirmWaitlistEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  })

  if (!entry) return { success: false, error: "Entrada no encontrada" }
  if (entry.status !== "NOTIFIED") return { success: false, error: "No está en estado de confirmación" }
  if (entry.expiresAt && entry.expiresAt < new Date()) {
    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: "EXPIRED" },
    })
    return { success: false, error: "El tiempo para confirmar expiró" }
  }

  // Create reservation + update entry in transaction
  await prisma.$transaction([
    prisma.reservation.create({
      data: {
        restaurantId: entry.restaurantId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        customerEmail: entry.customerEmail,
        dateTime: entry.dateTime,
        partySize: entry.partySize,
        status: "CONFIRMED",
        source: "WHATSAPP",
      },
    }),
    prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: "CONFIRMED" },
    }),
  ])

  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/lib/waitlist.ts && git commit -m "feat: add waitlist notification utility (notify, expire, confirm)"
```

---

## Task 4: Waitlist API Endpoints

**Files:**
- Create: `src/app/api/waitlist/route.ts`
- Create: `src/app/api/waitlist/[id]/route.ts`

- [ ] **Step 1: Create main waitlist endpoint (GET + POST)**

Create `src/app/api/waitlist/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { waitlistCreateSchema, parseBody } from "@/lib/schemas"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { checkAvailability } from "@/lib/availability"

// GET — List waitlist entries (authenticated, dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const { searchParams } = request.nextUrl
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (status) {
      where.status = status
    }

    if (date) {
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setUTCHours(23, 59, 59, 999)
      where.dateTime = { gte: dayStart, lte: dayEnd }
    }

    const entries = await prisma.waitlistEntry.findMany({
      where,
      orderBy: [{ dateTime: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json(entries)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — Join waitlist (public, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const blocked = applyRateLimit(rateLimiters.reservationWrite, request)
    if (blocked) return blocked

    const body = await request.json()
    const parsed = parseBody(waitlistCreateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { restaurantId, customerName, customerPhone, customerEmail, dateTime, partySize } = parsed.data

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { maxPartySize: true, maxCapacity: true, operatingHours: true, timezone: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 })
    }

    const parsedDate = new Date(dateTime)

    // Verify there truly is no capacity (prevent gaming)
    const availability = await checkAvailability({
      restaurantId,
      dateTime: parsedDate,
      partySize,
      maxPartySize: restaurant.maxPartySize,
      maxCapacity: restaurant.maxCapacity,
      operatingHours: restaurant.operatingHours as Record<string, { open: string; close: string }> | null,
      timezone: restaurant.timezone,
    })

    if (availability.available) {
      return NextResponse.json(
        { error: "Hay capacidad disponible, no es necesario unirse a la lista de espera" },
        { status: 400 }
      )
    }

    // Check if already on waitlist for same time
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        restaurantId,
        customerPhone,
        dateTime: parsedDate,
        status: { in: ["WAITING", "NOTIFIED"] },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Ya estás en la lista de espera para este horario" }, { status: 409 })
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        restaurantId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        dateTime: parsedDate,
        partySize,
      },
    })

    // Calculate position
    const position = await prisma.waitlistEntry.count({
      where: {
        restaurantId,
        dateTime: parsedDate,
        status: "WAITING",
        createdAt: { lte: entry.createdAt },
      },
    })

    return NextResponse.json({ ...entry, position }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create waitlist entry delete endpoint**

Create `src/app/api/waitlist/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!entry) {
      return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 })
    }

    await prisma.waitlistEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/api/waitlist/ && git commit -m "feat: add waitlist API endpoints (GET, POST, DELETE)"
```

---

## Task 5: Trigger Waitlist on Reservation Cancellation

**Files:**
- Modify: `src/app/api/reservations/[id]/route.ts`

- [ ] **Step 1: Add waitlist trigger to PATCH handler**

Add import at top of file:

```typescript
import { notifyNextInWaitlist } from "@/lib/waitlist"
```

In the `PATCH` function, after `const reservation = await prisma.reservation.update(...)` (line ~100), add:

```typescript
    // Trigger waitlist notification when reservation is cancelled
    if (status === "CANCELLED" && existing.status !== "CANCELLED") {
      notifyNextInWaitlist(
        session.restaurantId,
        existing.dateTime,
        existing.partySize
      ).catch((err) => console.error("Waitlist notification error:", err))
    }
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/api/reservations/[id]/route.ts && git commit -m "feat: trigger waitlist notification on reservation cancellation"
```

---

## Task 6: Waitlist Option in Public Booking API

**Files:**
- Modify: `src/app/api/book/[slug]/route.ts`

- [ ] **Step 1: Return waitlist option when unavailable**

In the POST handler, find the availability check block that returns 400 when unavailable. Change the error response to include a `waitlistAvailable` flag:

Find this pattern (the block that checks availability and returns error):

```typescript
    if (!availability.available) {
```

Change the response inside that block to:

```typescript
      return NextResponse.json(
        {
          error: availability.reason,
          waitlistAvailable: true,
          restaurantId: restaurant.id,
        },
        { status: 409 }
      )
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/api/book/[slug]/route.ts && git commit -m "feat: return waitlistAvailable flag when booking unavailable"
```

---

## Task 7: Escalated Conversations API

**Files:**
- Create: `src/app/api/conversations/escalated/route.ts`
- Create: `src/app/api/conversations/[id]/messages/route.ts`
- Create: `src/app/api/conversations/[id]/reply/route.ts`
- Create: `src/app/api/conversations/[id]/resolve/route.ts`

- [ ] **Step 1: Create escalated conversations list endpoint**

Create `src/app/api/conversations/escalated/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireSession()

    const conversations = await prisma.conversation.findMany({
      where: {
        restaurantId: session.restaurantId,
        status: "ESCALATED",
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        reservation: {
          select: { customerName: true, dateTime: true, partySize: true },
        },
      },
      orderBy: { escalatedAt: "desc" },
    })

    const result = conversations.map((c) => ({
      id: c.id,
      customerPhone: c.customerPhone,
      customerName: c.reservation?.customerName || null,
      lastMessage: c.messages[0]?.content || "",
      lastMessageRole: c.messages[0]?.role || null,
      escalatedAt: c.escalatedAt,
      escalatedReason: c.escalatedReason,
      reservation: c.reservation,
    }))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create messages endpoint**

Create `src/app/api/conversations/[id]/messages/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        customerPhone: conversation.customerPhone,
        status: conversation.status,
        escalatedAt: conversation.escalatedAt,
        escalatedReason: conversation.escalatedReason,
      },
      messages,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create reply endpoint (staff sends message via WhatsApp)**

Create `src/app/api/conversations/[id]/reply/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const { message } = await request.json()

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId, status: "ESCALATED" },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada o no escalada" }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { whatsappPhoneId: true, whatsappToken: true },
    })

    if (!restaurant?.whatsappPhoneId || !restaurant?.whatsappToken) {
      return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 400 })
    }

    // Save message
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: id,
        role: "ASSISTANT",
        content: message.trim(),
      },
    })

    // Send via WhatsApp
    const decryptedToken = safeDecrypt(restaurant.whatsappToken)
    await sendWhatsAppMessage(
      restaurant.whatsappPhoneId,
      decryptedToken,
      conversation.customerPhone,
      message.trim()
    )

    return NextResponse.json(savedMessage, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create resolve endpoint**

Create `src/app/api/conversations/[id]/resolve/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId, status: "ESCALATED" },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada o no escalada" }, { status: 404 })
    }

    await prisma.conversation.update({
      where: { id },
      data: { status: "COMPLETED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/api/conversations/ && git commit -m "feat: add escalated conversations API (list, messages, reply, resolve)"
```

---

## Task 8: WhatsApp Bot — Escalation Detection + Cancellation Tools + Waitlist Responses

**Files:**
- Modify: `src/lib/ai-agent.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`

- [ ] **Step 1: Add cancellation tools to ai-agent.ts**

In `src/lib/ai-agent.ts`, add after the `reservationTool` definition (after line ~71):

```typescript
const buscarReservasTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "buscar_reservas",
    description:
      "Busca reservas futuras confirmadas o pendientes del cliente por su número de teléfono. " +
      "Usar cuando el cliente quiere cancelar o consultar sus reservas.",
    parameters: {
      type: "object",
      properties: {
        telefono: {
          type: "string",
          description: "Número de teléfono del cliente (el mismo que está usando en WhatsApp)",
        },
      },
      required: ["telefono"],
    },
  },
}

const cancelarReservaTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "cancelar_reserva",
    description:
      "Cancela una reserva existente del cliente. SOLO usar después de que el cliente confirmó cuál reserva quiere cancelar.",
    parameters: {
      type: "object",
      properties: {
        reservationId: {
          type: "string",
          description: "ID de la reserva a cancelar",
        },
      },
      required: ["reservationId"],
    },
  },
}
```

- [ ] **Step 2: Update tools array and system prompt in processMessage**

In `processMessage`, change the `tools` array in `openai.chat.completions.create()`:

```typescript
      tools: [reservationTool, buscarReservasTool, cancelarReservaTool],
```

- [ ] **Step 3: Add cancellation instructions to system prompt**

In `buildSystemPrompt`, add before the `## Ejemplo de conversación` section:

```typescript
## Cancelaciones
- Si el cliente quiere cancelar una reserva, usá la función buscar_reservas con su número de teléfono.
- Si tiene una sola reserva futura, preguntá si quiere cancelar esa.
- Si tiene varias, listálas numeradas y pedí que elija.
- SOLO cancelar después de que el cliente confirmó.
- Si no tiene reservas, decile que no encontraste reservas a su nombre.

## Escalación a humano
- Si el cliente pide explícitamente hablar con una persona, humano, encargado u operador, respondé:
  "[ESCALATE:solicitud_cliente] Te conecto con nuestro equipo. Te van a responder a la brevedad."
- Si no podés resolver la consulta del cliente después de 2 intentos sobre el mismo tema, respondé:
  "[ESCALATE:no_resuelto] Parece que necesitás ayuda especializada. Te conecto con nuestro equipo."
```

- [ ] **Step 4: Handle multi-tool responses in processMessage**

Replace the tool_calls handling block (the `if (message.tool_calls...)` block) with:

```typescript
    // Check if the model wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as { type: string; function?: { name: string; arguments: string } }
      const fnName = toolCall.function?.name
      const fnArgs = toolCall.function?.arguments || "{}"

      if (fnName === "crear_reserva") {
        const reservation = parseToolCallArgs(fnArgs, restaurant.maxPartySize)
        const responseText = message.content || buildConfirmationText(reservation)
        return { text: responseText, reservation }
      }

      if (fnName === "buscar_reservas" || fnName === "cancelar_reserva") {
        // These are handled in the webhook route, not here
        const responseText = message.content || ""
        return {
          text: responseText,
          reservation: null,
          toolCall: { name: fnName, arguments: JSON.parse(fnArgs) },
        }
      }
    }
```

Update the `AgentResponse` interface to include optional toolCall:

```typescript
interface AgentResponse {
  text: string
  reservation: ReservationData | null
  toolCall?: { name: string; arguments: Record<string, unknown> }
}
```

- [ ] **Step 5: Update webhook handler to process escalation, waitlist responses, and cancellation tools**

In `src/app/api/whatsapp/webhook/route.ts`, in the `processIncomingMessage` function:

Add imports at the top:

```typescript
import { notifyNextInWaitlist, confirmWaitlistEntry, expireAndNotifyNext } from "@/lib/waitlist"
```

After saving the incoming message (step 4, line ~207) and before loading conversation history, add waitlist response check:

```typescript
  // Check if this is a waitlist response (customer has a NOTIFIED entry)
  const notifiedEntry = await prisma.waitlistEntry.findFirst({
    where: {
      restaurantId: restaurant.id,
      customerPhone,
      status: "NOTIFIED",
      expiresAt: { gt: new Date() },
    },
  })

  if (notifiedEntry) {
    const lower = messageText.toLowerCase().trim()
    const affirmative = ["sí", "si", "yes", "dale", "confirmo", "confirmar", "ok", "bueno"]
    const negative = ["no", "cancelar", "cancelo", "paso"]

    if (affirmative.some((w) => lower.includes(w))) {
      const result = await confirmWaitlistEntry(notifiedEntry.id)
      const reply = result.success
        ? "🎉 ¡Tu reserva fue confirmada! Te esperamos."
        : `No se pudo confirmar: ${result.error}`

      await prisma.message.create({
        data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
      })

      if (restaurant.whatsappToken) {
        const decryptedToken = safeDecrypt(restaurant.whatsappToken)
        await sendWhatsAppMessage(phoneNumberId, decryptedToken, customerPhone, reply)
      }
      return
    }

    if (negative.some((w) => lower.includes(w))) {
      await prisma.waitlistEntry.update({
        where: { id: notifiedEntry.id },
        data: { status: "CANCELLED" },
      })
      // Notify next in line
      await notifyNextInWaitlist(restaurant.id, notifiedEntry.dateTime, notifiedEntry.partySize)

      const reply = "Entendido, cancelamos tu lugar en la lista de espera."
      await prisma.message.create({
        data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
      })

      if (restaurant.whatsappToken) {
        const decryptedToken = safeDecrypt(restaurant.whatsappToken)
        await sendWhatsAppMessage(phoneNumberId, decryptedToken, customerPhone, reply)
      }
      return
    }
    // If neither affirmative nor negative, fall through to normal bot processing
  }

  // Check if conversation is ESCALATED — don't process with bot, just save message
  if (conversation.status === "ESCALATED") {
    // Message already saved above — staff will see it in dashboard
    return
  }

  // Expire stale waitlist entries for this restaurant
  await expireAndNotifyNext(restaurant.id)
```

After receiving the AI response (after step 7), add escalation detection and tool handling:

```typescript
  // Check for escalation pattern in response
  const escalateMatch = responseText.match(/\[ESCALATE:([^\]]+)\]/)
  if (escalateMatch) {
    responseText = responseText.replace(/\[ESCALATE:[^\]]+\]\s*/g, "").trim()

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "ESCALATED",
        escalatedAt: new Date(),
        escalatedReason: escalateMatch[1],
      },
    })
  }

  // Check for escalation keywords in customer message
  const escalationKeywords = ["humano", "persona", "hablar con alguien", "operador", "agente", "encargado"]
  if (escalationKeywords.some((kw) => messageText.toLowerCase().includes(kw)) && conversation.status === "ACTIVE") {
    responseText = "Te conecto con nuestro equipo. Te van a responder a la brevedad."
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "ESCALATED",
        escalatedAt: new Date(),
        escalatedReason: "customer_request",
      },
    })
  }

  // Handle cancellation tool calls
  if (agentResponse.toolCall) {
    const { name, arguments: args } = agentResponse.toolCall

    if (name === "buscar_reservas") {
      const reservations = await prisma.reservation.findMany({
        where: {
          restaurantId: restaurant.id,
          customerPhone: { contains: String(args.telefono || customerPhone) },
          status: { in: ["CONFIRMED", "PENDING"] },
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: "asc" },
        take: 10,
      })

      if (reservations.length === 0) {
        responseText = "No encontré reservas futuras a tu nombre."
      } else if (reservations.length === 1) {
        const r = reservations[0]
        const dateStr = r.dateTime.toLocaleDateString("es-AR", { timeZone: restaurant.timezone, weekday: "long", day: "numeric", month: "long" })
        const timeStr = r.dateTime.toLocaleTimeString("es-AR", { timeZone: restaurant.timezone, hour: "2-digit", minute: "2-digit", hour12: false })
        responseText = `Tenés una reserva para ${r.partySize} personas el ${dateStr} a las ${timeStr} a nombre de ${r.customerName}. ¿Querés cancelarla? (ID: ${r.id})`
      } else {
        responseText = "Tus reservas:\n" + reservations.map((r, i) => {
          const dateStr = r.dateTime.toLocaleDateString("es-AR", { timeZone: restaurant.timezone, weekday: "long", day: "numeric", month: "long" })
          const timeStr = r.dateTime.toLocaleTimeString("es-AR", { timeZone: restaurant.timezone, hour: "2-digit", minute: "2-digit", hour12: false })
          return `${i + 1}. ${dateStr} a las ${timeStr} — ${r.partySize} personas (${r.customerName})`
        }).join("\n") + "\n\n¿Cuál querés cancelar?"
      }
    }

    if (name === "cancelar_reserva") {
      const reservationId = String(args.reservationId)
      const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, restaurantId: restaurant.id },
      })

      if (!reservation) {
        responseText = "No encontré esa reserva."
      } else {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "CANCELLED" },
        })

        // Trigger waitlist
        notifyNextInWaitlist(restaurant.id, reservation.dateTime, reservation.partySize)
          .catch((err) => console.error("Waitlist notification error:", err))

        responseText = `Tu reserva para ${reservation.partySize} personas fue cancelada. Si querés reservar de nuevo, escribime.`
      }
    }
  }
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/lib/ai-agent.ts src/app/api/whatsapp/webhook/route.ts && git commit -m "feat: add WhatsApp escalation detection, cancellation tools, waitlist responses"
```

---

## Task 9: Onboarding Wizard — Extend to 5 Steps

**Files:**
- Create: `src/components/onboarding/step-whatsapp.tsx`
- Create: `src/components/onboarding/step-knowledge.tsx`
- Create: `src/components/onboarding/step-confirmation.tsx`
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create WhatsApp configuration step component**

Create `src/components/onboarding/step-whatsapp.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface StepWhatsAppProps {
  whatsappPhoneId: string
  whatsappToken: string
  openaiApiKey: string
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function StepWhatsApp({
  whatsappPhoneId,
  whatsappToken,
  openaiApiKey,
  onChange,
  onNext,
  onBack,
  onSkip,
}: StepWhatsAppProps) {
  const canContinue = whatsappPhoneId.trim() && whatsappToken.trim()

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Configurá tu bot de WhatsApp</p>
        <p>Necesitás una cuenta de WhatsApp Business API. Si no la tenés todavía, podés saltear este paso y configurarlo después.</p>
      </div>

      <div className="space-y-2">
        <Label>Phone Number ID</Label>
        <Input
          value={whatsappPhoneId}
          onChange={(e) => onChange("whatsappPhoneId", e.target.value)}
          placeholder="Ej: 123456789012345"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>Token de acceso</Label>
        <Input
          type="password"
          value={whatsappToken}
          onChange={(e) => onChange("whatsappToken", e.target.value)}
          placeholder="Token de Meta Business"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>OpenAI API Key (opcional)</Label>
        <Input
          type="password"
          value={openaiApiKey}
          onChange={(e) => onChange("openaiApiKey", e.target.value)}
          placeholder="sk-..."
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Si no proporcionás una, se usará la clave por defecto del sistema.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack}>
          Atrás
        </Button>
        <Button className="flex-1 h-11" onClick={onNext} disabled={!canContinue}>
          Siguiente
        </Button>
      </div>
      <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onSkip}>
        Saltear por ahora
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create Knowledge Base step component**

Create `src/components/onboarding/step-knowledge.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface StepKnowledgeProps {
  knowledgeBase: string
  restaurantName: string
  onChange: (value: string) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function StepKnowledge({
  knowledgeBase,
  restaurantName,
  onChange,
  onNext,
  onBack,
  onSkip,
}: StepKnowledgeProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Personalizá tu bot</p>
        <p>Escribí información sobre tu restaurante que el bot pueda usar para responder consultas de los clientes.</p>
      </div>

      <div className="space-y-2">
        <Label>Base de conocimiento</Label>
        <textarea
          value={knowledgeBase}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Somos ${restaurantName}, un restaurante ubicado en [dirección].\n\nNuestra especialidad es [tipo de cocina].\n\nPlatos destacados:\n- [Plato 1]\n- [Plato 2]\n\nEstacionamiento: [Sí/No]\nReservas mínimas: [N] personas\nEventos privados: [Sí/No]`}
          className="w-full min-h-[200px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          {knowledgeBase.length.toLocaleString()} / 50.000 caracteres
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack}>
          Atrás
        </Button>
        <Button className="flex-1 h-11" onClick={onNext}>
          Siguiente
        </Button>
      </div>
      <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onSkip}>
        Saltear por ahora
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Create Confirmation step component**

Create `src/components/onboarding/step-confirmation.tsx`:

```typescript
"use client"

import { Button } from "@/components/ui/button"

interface StepConfirmationProps {
  restaurantName: string
  slug: string
  timezone: string
  maxCapacity: string
  maxPartySize: string
  openDays: string[]
  hasWhatsApp: boolean
  hasKnowledgeBase: boolean
  onFinish: () => void
  onBack: () => void
  loading: boolean
}

export function StepConfirmation({
  restaurantName,
  slug,
  timezone,
  maxCapacity,
  maxPartySize,
  openDays,
  hasWhatsApp,
  hasKnowledgeBase,
  onFinish,
  onBack,
  loading,
}: StepConfirmationProps) {
  const bookingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}`

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-muted/60 border border-border/50 p-5 space-y-3">
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Restaurante</span>
          <span className="text-sm font-medium">{restaurantName}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Zona horaria</span>
          <span className="text-sm font-medium">{timezone.split("/").pop()?.replace(/_/g, " ")}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Capacidad</span>
          <span className="text-sm font-medium">{maxCapacity} personas</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Max por reserva</span>
          <span className="text-sm font-medium">{maxPartySize} personas</span>
        </div>
        <div className="flex justify-between items-start py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Días abiertos</span>
          <span className="text-sm font-medium text-right max-w-[60%]">
            {openDays.length > 0 ? openDays.join(", ") : "Ninguno"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">WhatsApp Bot</span>
          <span className={`text-sm font-medium ${hasWhatsApp ? "text-green-600" : "text-muted-foreground"}`}>
            {hasWhatsApp ? "Configurado" : "No configurado"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-sm text-muted-foreground">Base de conocimiento</span>
          <span className={`text-sm font-medium ${hasKnowledgeBase ? "text-green-600" : "text-muted-foreground"}`}>
            {hasKnowledgeBase ? "Configurada" : "No configurada"}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-300">
        <p className="font-medium mb-1">Tu link de reservas</p>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
          {bookingUrl}
        </a>
      </div>

      <Button className="w-full h-11 text-sm font-medium" onClick={onFinish} disabled={loading}>
        {loading ? "Guardando..." : "Ir al dashboard"}
      </Button>
      <Button variant="outline" className="w-full h-11" onClick={onBack}>
        Modificar
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Update onboarding page to 5 steps**

Replace the entire content of `src/app/onboarding/page.tsx` with the updated version that:
- Has 5 STEPS (Datos, Horarios, WhatsApp, Bot, Confirmar) with icons (Store, Clock, MessageSquare, Brain, Check)
- Adds state for whatsappPhoneId, whatsappToken, openaiApiKey, knowledgeBase, slug
- Imports and renders StepWhatsApp, StepKnowledge, StepConfirmation
- handleFinish saves all data including WhatsApp config and knowledge base (calls /api/settings/whatsapp and /api/settings/knowledge-base if data provided)
- Updates onboardingStep on the restaurant via PATCH

The key changes from the original:
1. Add `import { MessageSquare, Brain } from "lucide-react"` and the three new step components
2. Extend STEPS array to 5 items
3. Add state variables for new fields
4. Steps 3 and 4 render the new components with skip support
5. Step 5 renders StepConfirmation
6. handleFinish saves WhatsApp and knowledge base data if provided, then redirects

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/components/onboarding/ src/app/onboarding/page.tsx && git commit -m "feat: extend onboarding to 5 steps (WhatsApp config + knowledge base)"
```

---

## Task 10: Dashboard Navigation — Add Waitlist and Chats Links

**Files:**
- Modify: `src/app/dashboard/dashboard-nav.tsx`

- [ ] **Step 1: Add nav links with badge support**

Add import:

```typescript
import { useEffect, useState } from "react"
```

Inside the `DashboardNav` component, add state and polling for badge counts:

```typescript
  const [escalatedCount, setEscalatedCount] = useState(0)
  const [waitlistCount, setWaitlistCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [escRes, waitRes] = await Promise.all([
          fetch("/api/conversations/escalated"),
          fetch("/api/waitlist?status=WAITING"),
        ])
        if (escRes.ok) {
          const data = await escRes.json()
          setEscalatedCount(Array.isArray(data) ? data.length : 0)
        }
        if (waitRes.ok) {
          const data = await waitRes.json()
          setWaitlistCount(Array.isArray(data) ? data.length : 0)
        }
      } catch { /* ignore */ }
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])
```

Add the new nav buttons after "Clientes" and before the Configuracion button:

```tsx
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/waitlist" className="relative">
                  Lista de espera
                  {waitlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {waitlistCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/chats" className="relative">
                  Chats
                  {escalatedCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {escalatedCount}
                    </span>
                  )}
                </Link>
              </Button>
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/dashboard/dashboard-nav.tsx && git commit -m "feat: add Waitlist and Chats nav links with live badges"
```

---

## Task 11: Waitlist Dashboard Page

**Files:**
- Create: `src/app/dashboard/waitlist/page.tsx`

- [ ] **Step 1: Create waitlist dashboard page**

Create `src/app/dashboard/waitlist/page.tsx`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"

interface WaitlistEntry {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  notifiedAt: string | null
  expiresAt: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  WAITING: { label: "Esperando", variant: "default" },
  NOTIFIED: { label: "Notificado", variant: "secondary" },
  CONFIRMED: { label: "Confirmado", variant: "outline" },
  EXPIRED: { label: "Expirado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("")

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateFilter) params.set("date", dateFilter)
      const res = await fetch(`/api/waitlist?${params}`)
      if (res.ok) setEntries(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dateFilter])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 10000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  async function handleRemove(id: string) {
    await fetch(`/api/waitlist/${id}`, { method: "DELETE" })
    fetchEntries()
  }

  const activeEntries = entries.filter((e) => e.status === "WAITING" || e.status === "NOTIFIED")

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de espera</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeEntries.length} {activeEntries.length === 1 ? "persona esperando" : "personas esperando"}
          </p>
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay entradas en la lista de espera</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Teléfono</th>
                    <th className="pb-3 font-medium">Fecha/Hora</th>
                    <th className="pb-3 font-medium">Personas</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const dt = new Date(entry.dateTime)
                    const statusInfo = STATUS_LABELS[entry.status] || { label: entry.status, variant: "default" as const }
                    return (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{entry.customerName}</td>
                        <td className="py-3">{entry.customerPhone}</td>
                        <td className="py-3">
                          {dt.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}{" "}
                          {dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3">{entry.partySize}</td>
                        <td className="py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="py-3">
                          {(entry.status === "WAITING" || entry.status === "NOTIFIED") && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemove(entry.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/dashboard/waitlist/ && git commit -m "feat: add waitlist dashboard page with live polling"
```

---

## Task 12: Chats Dashboard Pages (Escalated Conversations)

**Files:**
- Create: `src/app/dashboard/chats/page.tsx`
- Create: `src/app/dashboard/chats/[id]/page.tsx`

- [ ] **Step 1: Create chats list page**

Create `src/app/dashboard/chats/page.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"

interface EscalatedChat {
  id: string
  customerPhone: string
  customerName: string | null
  lastMessage: string
  lastMessageRole: string | null
  escalatedAt: string
  escalatedReason: string | null
}

export default function ChatsPage() {
  const [chats, setChats] = useState<EscalatedChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch("/api/conversations/escalated")
        if (res.ok) setChats(await res.json())
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }

    fetchChats()
    const interval = setInterval(fetchChats, 5000)
    return () => clearInterval(interval)
  }, [])

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Chats escalados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conversaciones que necesitan atención humana
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
      ) : chats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay chats escalados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/dashboard/chats/${chat.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {chat.customerName || chat.customerPhone}
                      </span>
                      <Badge variant="destructive" className="text-[10px]">
                        {timeAgo(chat.escalatedAt!)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {chat.lastMessageRole === "USER" ? "Cliente: " : "Bot: "}
                      {chat.lastMessage}
                    </p>
                  </div>
                  {chat.escalatedReason && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {chat.escalatedReason === "customer_request" ? "Pidió humano" : "Bot no resolvió"}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create individual chat view page**

Create `src/app/dashboard/chats/[id]/page.tsx`:

```typescript
"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  createdAt: string
}

interface ConversationInfo {
  id: string
  customerPhone: string
  status: string
  escalatedAt: string | null
  escalatedReason: string | null
}

export default function ChatViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<ConversationInfo | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/conversations/${id}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages)
          setConversation(data.conversation)
        }
      } catch { /* ignore */ }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages((prev) => [...prev, msg])
        setReply("")
      }
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  async function handleResolve() {
    setResolving(true)
    try {
      await fetch(`/api/conversations/${id}/resolve`, { method: "POST" })
      router.push("/dashboard/chats")
    } catch { /* ignore */ }
    finally { setResolving(false) }
  }

  const isResolved = conversation?.status === "COMPLETED"

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chats">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">{conversation?.customerPhone || "..."}</h1>
            <p className="text-xs text-muted-foreground">
              {conversation?.escalatedReason === "customer_request" ? "Pidió hablar con humano" : "Bot no pudo resolver"}
            </p>
          </div>
        </div>
        {!isResolved && (
          <Button variant="outline" size="sm" onClick={handleResolve} disabled={resolving}>
            <CheckCircle className="w-4 h-4 mr-1" />
            {resolving ? "Cerrando..." : "Resolver"}
          </Button>
        )}
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "USER" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.role === "USER"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === "USER" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Reply input */}
      {!isResolved && (
        <div className="flex gap-2 mt-4">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Escribí un mensaje..."
            className="h-11"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button className="h-11 px-4" onClick={handleSend} disabled={sending || !reply.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/app/dashboard/chats/ && git commit -m "feat: add escalated chats dashboard with real-time messaging"
```

---

## Task 13: Allow Webhook and Waitlist Routes in Middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Verify waitlist POST route is accessible**

Check `src/middleware.ts` — the public booking API `/api/book` is already excluded. The waitlist POST endpoint at `/api/waitlist` needs to be accessible publicly (for the public booking widget to add entries). Since all `/api/` routes that aren't in the matcher should already pass through, verify the matcher config. If `/api/waitlist` is caught by the matcher, add it to the exclusion list.

The current matcher excludes `/api/register`, `/api/auth`, `/api/book`, `/api/whatsapp/webhook`, `/api/webhooks`, `/api/cron`. Add `/api/waitlist` to the exclusions if needed.

- [ ] **Step 2: Commit if changes were needed**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add src/middleware.ts && git commit -m "feat: allow public access to waitlist API"
```

---

## Task 14: Build and Verify

- [ ] **Step 1: Run Prisma generate**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 2: Run build to check for type errors**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Fix any build errors found**

If build fails, fix the TypeScript errors and re-run.

- [ ] **Step 4: Final commit**

```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && git add -A && git commit -m "feat: Semana 3 UX features complete — waitlist, onboarding, escalation, cancellations"
```
