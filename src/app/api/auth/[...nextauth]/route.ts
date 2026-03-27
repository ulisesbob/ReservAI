import { NextRequest, NextResponse } from "next/server"
import { handlers } from "@/auth"
import { checkRateLimit, rateLimiters, getClientIp } from "@/lib/rate-limit"

export const { GET } = handlers

export async function POST(request: NextRequest) {
  // Rate limit login attempts: 5 per IP per 15 minutes
  const ip = getClientIp(request)
  const rl = await checkRateLimit(rateLimiters.login, ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de login. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  return handlers.POST(request)
}
