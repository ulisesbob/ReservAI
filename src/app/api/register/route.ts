import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { WelcomeEmail } from "@/lib/email-templates/welcome"
import { checkRateLimit, rateLimiters, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // Rate limit: 3 registrations per IP per hour
    const ip = getClientIp(request)
    const rl = checkRateLimit(rateLimiters.register, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { restaurantName, name, email, password, timezone } = body

    if (!restaurantName || !name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      )
    }

    if (restaurantName.length > 100 || name.length > 100 || email.length > 255) {
      return NextResponse.json(
        { error: "Datos demasiado largos" },
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

    const suffix = `-${Date.now().toString(36)}`
    const finalSlug = existingSlug
      ? `${slug.slice(0, 50 - suffix.length)}${suffix}`
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

    // Send welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: "Bienvenido a ReservasAI",
      react: WelcomeEmail({ name }),
    }).catch((err) => console.error("Welcome email failed:", err))

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
