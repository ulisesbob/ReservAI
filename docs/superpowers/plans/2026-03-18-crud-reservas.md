# CRUD Reservas + Dashboard — ReservaYa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar API CRUD de reservas con multi-tenancy y dashboard funcional con lista de reservas del día, acciones rápidas, filtro por status, y creación manual.

**Architecture:** API Routes en `/api/reservations` con CRUD completo filtrado por `restaurantId`. Dashboard como Server Component que consulta reservas del día. Modal/form para crear reserva manual. Todas las queries usan `requireSession()` para multi-tenancy.

**Tech Stack:** Next.js 14 App Router, Prisma, Server Components, Client Components para interactividad

---

## File Structure

```
src/
├── app/
│   ├── api/reservations/
│   │   ├── route.ts                    # GET (list) + POST (create)
│   │   └── [id]/route.ts              # PATCH (update status) + DELETE
│   └── dashboard/
│       ├── page.tsx                    # Dashboard principal (server component)
│       ├── reservation-list.tsx        # Lista de reservas (client component)
│       ├── reservation-form.tsx        # Form crear/editar reserva (client component)
│       └── layout.tsx                  # Dashboard layout con nav
└── lib/
    └── auth.ts                         # (existing) getSession helpers
```

---

### Task 1: API GET /api/reservations (listar reservas)

**Files:**
- Create: `src/app/api/reservations/route.ts`

- [ ] **Step 1: Crear endpoint GET con filtros**

Crear `src/app/api/reservations/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const date = searchParams.get("date") // YYYY-MM-DD

    const where: any = { restaurantId: session.restaurantId }

    if (status) {
      where.status = status
    }

    if (date) {
      const start = new Date(`${date}T00:00:00`)
      const end = new Date(`${date}T23:59:59`)
      where.dateTime = { gte: start, lte: end }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { dateTime: "asc" },
    })

    return NextResponse.json(reservations)
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    console.error("Error fetching reservations:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reservations/route.ts
git commit -m "feat: add GET /api/reservations with date and status filters"
```

---

### Task 2: API POST /api/reservations (crear reserva manual)

**Files:**
- Modify: `src/app/api/reservations/route.ts`

- [ ] **Step 1: Agregar POST handler**

Agregar al mismo archivo:

```typescript
export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { customerName, customerPhone, customerEmail, dateTime, partySize } = body

    if (!customerName || !customerPhone || !dateTime || !partySize) {
      return NextResponse.json(
        { error: "Nombre, teléfono, fecha/hora y cantidad de personas son obligatorios" },
        { status: 400 }
      )
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: session.restaurantId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        dateTime: new Date(dateTime),
        partySize: Number(partySize),
        source: "MANUAL",
        status: "CONFIRMED",
      },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    console.error("Error creating reservation:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar que compila**

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reservations/route.ts
git commit -m "feat: add POST /api/reservations for manual reservation creation"
```

---

### Task 3: API PATCH/DELETE /api/reservations/[id]

**Files:**
- Create: `src/app/api/reservations/[id]/route.ts`

- [ ] **Step 1: Crear endpoint PATCH (actualizar status) + DELETE**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const reservation = await prisma.reservation.findFirst({
      where: { id: params.id, restaurantId: session.restaurantId },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: body,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession()

    const reservation = await prisma.reservation.findFirst({
      where: { id: params.id, restaurantId: session.restaurantId },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    await prisma.reservation.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar que compila**

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reservations/
git commit -m "feat: add PATCH and DELETE for /api/reservations/[id]"
```

---

### Task 4: Dashboard layout con navegación

**Files:**
- Create: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Crear layout del dashboard**

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold">
              ReservaYa
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Reservas
            </Link>
            {isAdmin && (
              <Link href="/settings/restaurant" className="text-sm text-gray-600 hover:text-gray-900">
                Configuración
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded">{session.user.role}</span>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout with navigation"
```

---

### Task 5: Dashboard page con lista de reservas

**Files:**
- Modify: `src/app/dashboard/page.tsx` (rewrite)
- Create: `src/app/dashboard/reservation-list.tsx`
- Create: `src/app/dashboard/reservation-form.tsx`

- [ ] **Step 1: Crear componente de lista de reservas (client)**

Crear `src/app/dashboard/reservation-list.tsx` — Client component que:
- Recibe reservas como props
- Muestra tabla con: hora, nombre, personas, status (badge con color), origen
- Acciones rápidas por reserva: Confirmar, Cancelar, Completar (botones que llaman PATCH /api/reservations/[id])
- Filtro por status (dropdown)
- Botón "Nueva Reserva" que abre el form
- Usa fetch + router.refresh() para actualizar después de cada acción

- [ ] **Step 2: Crear formulario de reserva manual (client)**

Crear `src/app/dashboard/reservation-form.tsx` — Client component que:
- Campos: customerName, customerPhone, customerEmail (opt), dateTime (datetime-local), partySize
- Submit llama POST /api/reservations
- onSuccess cierra el form y refresca la lista

- [ ] **Step 3: Reescribir dashboard page (server component)**

Reescribir `src/app/dashboard/page.tsx` — Server component que:
- Usa requireSession() para obtener restaurantId
- Query reservas del día con Prisma (server-side, no API call)
- Pasa las reservas como props a ReservationList
- Muestra fecha actual y stats básicos (total reservas, confirmadas, personas)

- [ ] **Step 4: Verificar build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/
git commit -m "feat: add dashboard with reservation list, filters, and manual creation"
```

---

### Task 6: Verificación final

- [ ] **Step 1: Build + tipos**

```bash
npx tsc --noEmit && npx next build
```

- [ ] **Step 2: Test manual**

1. npm run dev
2. Registrar restaurante
3. Crear reserva manual desde dashboard
4. Verificar que aparece en la lista
5. Confirmar, cancelar, completar reservas
6. Verificar filtro por status
