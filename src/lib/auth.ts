import { auth } from "@/auth"

export async function getSession() {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.restaurantId) {
    return null
  }

  return {
    userId: session.user.id,
    restaurantId: session.user.restaurantId,
    role: session.user.role as "ADMIN" | "EMPLOYEE",
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    subscriptionStatus: session.user.subscriptionStatus as string,
    trialEndsAt: session.user.trialEndsAt as string | null,
    onboardingCompleted: session.user.onboardingCompleted as boolean,
  }
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (session.role !== "ADMIN") {
    throw new Error("Forbidden")
  }
  return session
}
