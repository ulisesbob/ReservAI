import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TeamList } from "./team-list"

export default async function TeamSettingsPage() {
  const session = await requireAdmin()

  const users = await prisma.user.findMany({
    where: { restaurantId: session.restaurantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return (
    <TeamList
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session.userId}
    />
  )
}
