# Autenticación — ReservaYa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar autenticación completa con NextAuth.js v5 (Credentials + JWT), registro de restaurante + admin, middleware de protección de rutas, y helper de multi-tenancy para API routes.

**Architecture:** NextAuth.js v5 con Credentials provider y JWT strategy. El JWT contiene `id`, `role`, `restaurantId`. Un middleware protege `/dashboard/**` y `/settings/**`. Un helper `getSession()` extrae la sesión con tenant info para API routes.

**Tech Stack:** NextAuth.js v5 (next-auth@beta → ahora estable), bcryptjs, Prisma Client

---

## File Structure

```
src/
├── auth.ts                              # NextAuth config (providers, callbacks)
├── middleware.ts                         # Route protection middleware
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth API route handler
│   ├── api/register/route.ts            # POST /api/register
│   ├── login/page.tsx                   # Login page
│   └── register/page.tsx                # Register page
└── lib/
    ├── prisma.ts                        # (existing)
    └── auth.ts                          # getSession helper for API routes
```

---

### Task 1: Instalar dependencias de auth

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar next-auth, bcryptjs y tipos**

```bash
npm install next-auth@latest bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 2: Generar NEXTAUTH_SECRET y agregarlo a .env**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el output a `.env` como `NEXTAUTH_SECRET="<valor>"`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add next-auth and bcryptjs dependencies"
```

---

### Task 2: Configurar NextAuth con Credentials provider

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `.env` (ya tiene NEXTAUTH_SECRET)

- [ ] **Step 1: Crear config principal de NextAuth**

Crear `src/auth.ts`:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.restaurantId = (user as any).restaurantId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.restaurantId = token.restaurantId as string
      return session
    },
  },
})
```

- [ ] **Step 2: Crear type augmentation para NextAuth**

Crear `src/types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      restaurantId: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    restaurantId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    restaurantId: string
  }
}
```

- [ ] **Step 3: Crear route handler**

Crear `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/types/next-auth.d.ts src/app/api/auth/
git commit -m "feat: configure NextAuth with Credentials provider and JWT"
```

---

### Task 3: Crear API de registro

**Files:**
- Create: `src/app/api/register/route.ts`

- [ ] **Step 1: Crear endpoint POST /api/register**

Crear `src/app/api/register/route.ts`:

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { restaurantName, name, email, password, timezone } = body

    if (!restaurantName || !name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      )
    }

    const slug = restaurantName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50)

    const existingSlug = await prisma.restaurant.findUnique({
      where: { slug },
    })

    const finalSlug = existingSlug
      ? `${slug}-${Date.now().toString(36)}`
      : slug

    const hashedPassword = await bcrypt.hash(password, 12)

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
      },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(
      { restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/register/
git commit -m "feat: add registration API endpoint"
```

---

### Task 4: Crear middleware de protección de rutas

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Crear middleware**

Crear `src/middleware.ts`:

```typescript
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const protectedPaths = ["/dashboard", "/settings"]
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const authPaths = ["/login", "/register"]
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware for route protection"
```

---

### Task 5: Crear helper de sesión para API routes

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Crear helper getSession**

Crear `src/lib/auth.ts`:

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

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add session helpers with multi-tenancy support"
```

---

### Task 6: Crear páginas de login y registro

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Crear página de login**

Crear `src/app/login/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email o contraseña incorrectos")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear página de registro**

Crear `src/app/register/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      restaurantName: formData.get("restaurantName") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Error al registrar")
        setLoading(false)
        return
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Registro exitoso pero error al iniciar sesión. Intentá ingresar manualmente.")
        setLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Error de conexión")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Registrar Restaurante</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Restaurante
            </label>
            <input
              id="restaurantName"
              name="restaurantName"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tu Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear placeholder de dashboard**

Crear `src/app/dashboard/page.tsx`:

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Bienvenido, {session.user.name}
      </p>
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">
        {JSON.stringify(session.user, null, 2)}
      </pre>
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/login/ src/app/register/ src/app/dashboard/
git commit -m "feat: add login, register, and dashboard pages"
```

---

### Task 7: Verificación final de autenticación

- [ ] **Step 1: Verificar build completo**

```bash
npx next build
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Test manual del flujo completo**

```bash
npm run dev
```

1. Abrir http://localhost:3000/register
2. Registrar un restaurante de prueba
3. Verificar que redirige a /dashboard
4. Verificar que /dashboard muestra la sesión con `id`, `role`, `restaurantId`
5. Abrir http://localhost:3000/login en incógnito
6. Login con las credenciales del registro
7. Verificar que /dashboard muestra la misma info
8. Navegar a /dashboard sin sesión → debe redirigir a /login
