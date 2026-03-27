import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"
import { getAuthUrl, exchangeCodeForToken } from "@/lib/google-calendar"

/**
 * GET /api/auth/google-calendar
 *
 * Without ?code  — redirects to Google OAuth consent screen.
 * With    ?code  — handles the OAuth callback: exchanges code for tokens,
 *                  stores the encrypted refresh token, then redirects back
 *                  to the settings page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  // --- OAuth callback ---
  if (error) {
    return NextResponse.redirect(
      new URL("/settings/google-calendar?error=access_denied", request.url)
    )
  }

  if (code) {
    try {
      // The session must exist for the restaurant owner context
      const session = await requireAdmin()

      const { refreshToken } = await exchangeCodeForToken(code)
      const encryptedToken = encrypt(refreshToken)

      await prisma.restaurant.update({
        where: { id: session.restaurantId },
        data: {
          googleCalendarToken: encryptedToken,
          googleCalendarEnabled: true,
        },
      })

      return NextResponse.redirect(
        new URL("/settings/google-calendar?connected=true", request.url)
      )
    } catch (err) {
      console.error("[GoogleCalendar] OAuth callback error:", err)
      return NextResponse.redirect(
        new URL("/settings/google-calendar?error=auth_failed", request.url)
      )
    }
  }

  // --- Initiate OAuth flow ---
  try {
    // Verify the user is logged in before starting the flow
    await requireAdmin()
    const authUrl = getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch {
    return NextResponse.redirect(
      new URL("/settings/google-calendar?error=unauthorized", request.url)
    )
  }
}
