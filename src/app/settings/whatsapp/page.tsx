import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WhatsAppForm } from "./whatsapp-form"

export default async function WhatsAppSettingsPage() {
  const session = await requireAdmin()

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      whatsappPhoneId: true,
      whatsappToken: true,
    },
  })

  return (
    <WhatsAppForm
      initialData={{
        whatsappPhoneId: restaurant.whatsappPhoneId ?? "",
        whatsappToken: restaurant.whatsappToken ?? "",
      }}
    />
  )
}
