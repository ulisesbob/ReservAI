import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createResetToken } from "@/lib/reset-token"
import { sendEmail } from "@/lib/email"
import { PasswordResetEmail } from "@/lib/email-templates/password-reset"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const rateLimiter = { name: "forgot-password", maxRequests: 3, windowMs: 15 * 60 * 1000 }

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(rateLimiter, ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "Si el email existe, recibirás un enlace para restablecer tu contraseña." },
        { status: 200 }
      )
    }

    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    // Always return same response to prevent email enumeration
    const genericResponse = NextResponse.json(
      { message: "Si el email existe, recibirás un enlace para restablecer tu contraseña." },
      { status: 200 }
    )

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    })

    if (!user) return genericResponse

    const token = createResetToken(user.id)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Non-blocking: send email but don't let a failure change the HTTP response.
    // sendEmail never throws — it returns a result object.
    sendEmail({
      to: user.email,
      subject: "Restablecer contraseña — ReservasAI",
      react: PasswordResetEmail({ name: user.name, resetUrl }),
    }).then((result) => {
      if (!result.success && !result.skipped) {
        console.error("Password reset email failed:", result.error)
      }
    })

    return genericResponse
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { message: "Si el email existe, recibirás un enlace para restablecer tu contraseña." },
      { status: 200 }
    )
  }
}
