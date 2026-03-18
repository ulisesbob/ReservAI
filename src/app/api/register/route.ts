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
