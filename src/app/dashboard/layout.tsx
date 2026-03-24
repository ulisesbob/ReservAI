import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardNav } from "./dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Onboarding gate: check DB directly (not stale JWT)
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { operatingHours: true },
  })
  if (!restaurant?.operatingHours) redirect("/onboarding")

  const { name, role } = session.user

  return (
    <div className="min-h-screen bg-muted/40">
      <DashboardNav name={name ?? ""} role={role ?? "EMPLOYEE"} />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
