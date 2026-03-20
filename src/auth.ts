import NextAuth from "next-auth"
import type { User } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 3600 },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Initial login: populate from user object
      if (user) {
        const u = user as User & {
          role?: string
          restaurantId?: string
          subscriptionStatus?: string
          trialEndsAt?: string | null
          onboardingCompleted?: boolean
        }
        token.id = u.id
        token.role = u.role
        token.restaurantId = u.restaurantId
        token.subscriptionStatus = u.subscriptionStatus
        token.trialEndsAt = u.trialEndsAt
        token.onboardingCompleted = u.onboardingCompleted
        token.lastRefresh = Date.now()
        return token
      }

      // Periodic refresh: every 5 minutes, re-fetch from DB
      const lastRefresh = token.lastRefresh as number | undefined
      const fiveMinutes = 5 * 60 * 1000
      if (!lastRefresh || Date.now() - lastRefresh > fiveMinutes) {
        const fresh = await prisma.restaurant.findUnique({
          where: { id: token.restaurantId as string },
          select: {
            operatingHours: true,
            subscription: { select: { status: true, trialEndsAt: true } },
          },
        })
        if (fresh) {
          token.subscriptionStatus = fresh.subscription?.status ?? "TRIALING"
          token.trialEndsAt = fresh.subscription?.trialEndsAt?.toISOString() ?? null
          token.onboardingCompleted = !!fresh.operatingHours
          token.lastRefresh = Date.now()
        }
      }

      return token
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            restaurantId: true,
            restaurant: {
              select: {
                operatingHours: true,
                subscription: {
                  select: {
                    status: true,
                    trialEndsAt: true,
                  },
                },
              },
            },
          },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId,
          subscriptionStatus: user.restaurant.subscription?.status ?? "TRIALING",
          trialEndsAt: user.restaurant.subscription?.trialEndsAt?.toISOString() ?? null,
          onboardingCompleted: !!user.restaurant.operatingHours,
        }
      },
    }),
  ],
})
