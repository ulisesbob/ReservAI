import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    restaurantId?: string
    subscriptionStatus?: string
    trialEndsAt?: string | null
    onboardingCompleted?: boolean
  }

  interface Session {
    user: User & {
      id: string
      role: string
      restaurantId: string
      subscriptionStatus: string
      trialEndsAt: string | null
      onboardingCompleted: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    restaurantId?: string
    subscriptionStatus?: string
    trialEndsAt?: string | null
    onboardingCompleted?: boolean
    lastRefresh?: number
  }
}
