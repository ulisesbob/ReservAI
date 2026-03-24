import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyResetToken } from "@/lib/reset-token"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const rateLimiter = { name: "reset-password", maxRequests: 5, windowMs: 15 * 60 * 1000 }

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(rateLimiter, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo más tarde." },
        { status: 429 }
      )
    }

    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña requeridos" }, { status: 400 })
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    const userId = verifyResetToken(token)
    if (!userId) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado. Solicita uno nuevo." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado. Solicita uno nuevo." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "Contraseña actualizada exitosamente" })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
