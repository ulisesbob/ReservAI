import { NextRequest, NextResponse } from "next/server"
import { locales } from "@/i18n/config"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const blocked = await applyRateLimit(rateLimiters.locale, request)
  if (blocked) return blocked

  const { locale } = await request.json()
  if (!locales.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  return response
}
