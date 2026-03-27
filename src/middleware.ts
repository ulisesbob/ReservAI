import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export default middleware

export const config = {
  matcher: [
    "/((?!api/register|api/auth|api/book|api/waitlist|api/whatsapp/webhook|api/webhooks|api/cron|api/locale|book|_next/static|_next/image|favicon.ico).*)",
  ],
}
