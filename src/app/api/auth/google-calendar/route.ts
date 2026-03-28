import { timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"
import { getAuthUrl, exchangeCodeForToken } from "@/lib/google-calendar"

const GCAL_STATE_COOKIE = "gcal_state"

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
      // Validate the CSRF state parameter using timing-safe comparison
      const cookieStore = await cookies()
      const storedState = cookieStore.get(GCAL_STATE_COOKIE)?.value
      const returnedState = searchParams.get("state")

      if (
        !storedState ||
        !returnedState ||
        storedState.length !== returnedState.length ||
        !timingSafeEqual(Buffer.from(storedState), Buffer.from(returnedState))
      ) {
        console.error("[GoogleCalendar] CSRF state mismatch")
        return NextResponse.redirect(
          new URL("/settings/google-calendar?error=invalid_state", request.url)
        )
      }

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

      // Delete the state cookie after successful validation
      const response = NextResponse.redirect(
        new URL("/settings/google-calendar?connected=true", request.url)
      )
      response.cookies.delete(GCAL_STATE_COOKIE)
      return response
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
    const { url: authUrl, state } = getAuthUrl()
    const response = NextResponse.redirect(authUrl)
    response.cookies.set(GCAL_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    })
    return response
  } catch {
    return NextResponse.redirect(
      new URL("/settings/google-calendar?error=unauthorized", request.url)
    )
  }
}
