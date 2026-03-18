# Setup Proyecto — ReservaYa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el proyecto Next.js 14 con Prisma, PostgreSQL (Neon), esquema de datos completo con multi-tenancy, y estructura base lista para autenticación.

**Architecture:** Monolito fullstack Next.js 14 App Router con Prisma ORM conectado a PostgreSQL en Neon. Multi-tenancy por `restaurantId` en todos los modelos. Singleton de PrismaClient para evitar conexiones excesivas en dev.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma ORM, PostgreSQL (Neon), Tailwind CSS

---

## File Structure

```
reserva-ya/
├── prisma/
│   └── schema.prisma              # Esquema completo de datos
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page (placeholder)
│   └── lib/
│       └── prisma.ts              # Singleton PrismaClient
├── .env                           # Variables de entorno (no commitear)
├── .env.example                   # Template de variables
├── .gitignore                     # Ignorar node_modules, .env, etc.
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.mjs
```

---

### Task 1: Crear proyecto Next.js 14

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Scaffold del proyecto con create-next-app**

```bash
cd "/c/Users/Ulise/Desktop/saas para reserva de clientes"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbo
```

Seleccionar: NO a Turbopack. El `.` instala en el directorio actual.

- [ ] **Step 2: Verificar que el proyecto arranca**

```bash
cd "/c/Users/Ulise/Desktop/saas para reserva de clientes"
npx next build
```

Expected: Build exitoso sin errores.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs .gitignore .eslintrc.json src/ public/
git commit -m "feat: scaffold Next.js 14 project with TypeScript and Tailwind"
```

---

### Task 2: Configurar Prisma con PostgreSQL

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `.env.example`
- Modify: `.gitignore` (verificar que `.env` está incluido)

- [ ] **Step 1: Instalar Prisma**

```bash
npm install prisma --save-dev
npm install @prisma/client
```

- [ ] **Step 2: Inicializar Prisma con PostgreSQL**

```bash
npx prisma init --datasource-provider postgresql
```

Esto crea `prisma/schema.prisma` y `.env` con `DATABASE_URL`.

- [ ] **Step 3: Crear `.env.example`**

Crear archivo `.env.example`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Encryption
ENCRYPTION_KEY=""

# NextAuth
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 4: Verificar `.gitignore` incluye `.env`**

Confirmar que `.gitignore` contiene `.env` (create-next-app ya lo incluye, pero verificar).

- [ ] **Step 5: Crear singleton de PrismaClient**

Crear `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts .env.example
git commit -m "feat: add Prisma ORM with PostgreSQL config and client singleton"
```

---

### Task 3: Definir esquema completo de datos

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Escribir esquema con todos los modelos**

Reemplazar contenido de `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === ENUMS ===

enum Role {
  ADMIN
  EMPLOYEE
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum ReservationSource {
  WHATSAPP
  MANUAL
}

enum ConversationStatus {
  ACTIVE
  COMPLETED
  EXPIRED
}

enum MessageRole {
  USER
  ASSISTANT
}

// === MODELS ===

model Restaurant {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  timezone       String   @default("America/Argentina/Buenos_Aires")
  maxCapacity    Int
  maxPartySize   Int      @default(20)
  operatingHours Json?
  whatsappPhoneId String?
  whatsappToken  String?  // Encriptado AES-256-GCM
  openaiApiKey   String?  // Encriptado AES-256-GCM
  knowledgeBase  String?  @db.Text
  createdAt      DateTime @default(now())

  users          User[]
  reservations   Reservation[]
  conversations  Conversation[]
}

model User {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  email        String   @unique
  password     String   // Hasheado con bcrypt
  role         Role     @default(EMPLOYEE)
  createdAt    DateTime @default(now())

  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@index([restaurantId])
}

model Reservation {
  id            String            @id @default(cuid())
  restaurantId  String
  customerName  String
  customerPhone String
  customerEmail String?
  dateTime      DateTime
  partySize     Int
  status        ReservationStatus @default(PENDING)
  source        ReservationSource @default(MANUAL)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  restaurant    Restaurant    @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  conversations Conversation[]

  @@index([restaurantId])
  @@index([restaurantId, dateTime])
  @@index([restaurantId, status])
}

model Conversation {
  id            String             @id @default(cuid())
  restaurantId  String
  customerPhone String
  status        ConversationStatus @default(ACTIVE)
  reservationId String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  restaurant    Restaurant  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reservation   Reservation? @relation(fields: [reservationId], references: [id], onDelete: SetNull)
  messages      Message[]

  @@index([restaurantId])
  @@index([restaurantId, customerPhone, status])
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String      @db.Text
  createdAt      DateTime    @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

- [ ] **Step 2: Validar el esquema**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid.`

- [ ] **Step 3: Generar Prisma Client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` sin errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: define complete data schema with multi-tenancy indexes"
```

---

### Task 4: Conectar a Neon y ejecutar migración

**Files:**
- Create: `prisma/migrations/` (auto-generado)

- [ ] **Step 1: Configurar DATABASE_URL en `.env`**

El usuario debe poner su connection string de Neon en `.env`:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

- [ ] **Step 2: Ejecutar primera migración**

```bash
npx prisma migrate dev --name init
```

Expected: Migración creada exitosamente, tablas creadas en Neon.

- [ ] **Step 3: Verificar conexión con Prisma Studio**

```bash
npx prisma studio
```

Expected: Se abre el browser mostrando las tablas vacías (Restaurant, User, Reservation, Conversation, Message).

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "feat: run initial migration to Neon PostgreSQL"
```

---

### Task 5: Verificación final del setup

- [ ] **Step 1: Verificar build completo**

```bash
npx next build
```

Expected: Build exitoso, 0 errores.

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errores de tipos.

- [ ] **Step 3: Verificar que Prisma Client importa correctamente**

Crear test temporal: agregar en `src/app/page.tsx` un import de prisma y verificar que no hay errores de tipos. Luego revertir.

- [ ] **Step 4: Resumen de estado**

Después de completar todos los tasks, el proyecto tiene:
- Next.js 14 App Router con TypeScript y Tailwind
- Prisma ORM configurado con PostgreSQL (Neon)
- Esquema completo: Restaurant, User, Reservation, Conversation, Message
- Multi-tenancy: índices por `restaurantId` en todos los modelos
- Singleton de PrismaClient para dev
- Migración inicial aplicada
