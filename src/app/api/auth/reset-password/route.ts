import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyResetToken } from "@/lib/reset-token"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { validatePassword } from "@/lib/validation"

const rateLimiter = { name: "reset-password", maxRequests: 5, windowMs: 15 * 60 * 1000 }

const INVALID_TOKEN_MSG = "El enlace es inválido o ha expirado. Solicita uno nuevo."

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

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const payload = verifyResetToken(token)
    if (!payload) {
      return NextResponse.json({ error: INVALID_TOKEN_MSG }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, updatedAt: true },
    })
    if (!user) {
      return NextResponse.json({ error: INVALID_TOKEN_MSG }, { status: 400 })
    }

    // Single-use check: reject if password was changed after token was issued
    if (user.updatedAt && user.updatedAt.getTime() > payload.issuedAt) {
      return NextResponse.json({ error: INVALID_TOKEN_MSG }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "Contraseña actualizada exitosamente" })
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
