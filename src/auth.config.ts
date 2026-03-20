import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.restaurantId = token.restaurantId as string
      session.user.subscriptionStatus = token.subscriptionStatus as string
      session.user.trialEndsAt = token.trialEndsAt as string | null
      session.user.onboardingCompleted = token.onboardingCompleted as boolean
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const protectedPaths = ["/dashboard", "/settings", "/onboarding"]
      const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

      if (isProtected && !isLoggedIn) return false

      const authPaths = ["/login", "/register"]
      const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Billing gate: if logged in and accessing protected routes (except billing & onboarding)
      if (isLoggedIn && isProtected) {
        const billingExempt = ["/settings/billing", "/onboarding"]
        const isBillingExempt = billingExempt.some((path) => pathname.startsWith(path))

        if (!isBillingExempt) {
          const status = auth?.user?.subscriptionStatus
          const trialEndsAt = auth?.user?.trialEndsAt

          const isTrialExpired = status === "TRIALING" && (!trialEndsAt || new Date(trialEndsAt) < new Date())
          const isInactive = status === "PAST_DUE" || status === "CANCELLED"

          if (isTrialExpired || isInactive) {
            return Response.redirect(new URL("/settings/billing", nextUrl))
          }

          // Onboarding gate moved to dashboard layout (needs real-time DB check, not stale JWT)
        }
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
