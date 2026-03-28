import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

/**
 * Security headers applied to every response that passes through the middleware.
 * These mitigate XSS, clickjacking, MIME-sniffing, and information leakage.
 */
const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "0",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.mercadopago.com https://api.openai.com",
    "frame-ancestors 'none'",
  ].join("; "),
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

// Wrap the NextAuth middleware so we can attach security headers to every response.
export default auth((req: NextRequest & { auth?: unknown }) => {
  const response = NextResponse.next()
  return applySecurityHeaders(response)
})

export const config = {
  matcher: [
    "/((?!api/register|api/auth|api/book|api/waitlist|api/whatsapp/webhook|api/webhooks|api/cron|api/locale|book|_next/static|_next/image|favicon.ico).*)",
  ],
}
