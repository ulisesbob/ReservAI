import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { KBForm } from "./kb-form"

export default async function KnowledgeBaseSettingsPage() {
  const session = await requireAdmin()

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: { knowledgeBase: true },
  })

  return <KBForm initialKnowledgeBase={restaurant.knowledgeBase ?? ""} />
}
