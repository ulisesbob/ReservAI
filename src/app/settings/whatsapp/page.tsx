import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { safeDecrypt, maskSecret } from "@/lib/encryption"
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

  // Decrypt and mask the token — never send the full token to the client
  const hasToken = !!restaurant.whatsappToken
  let maskedToken = ""
  if (hasToken && restaurant.whatsappToken) {
    const decrypted = safeDecrypt(restaurant.whatsappToken)
    maskedToken = maskSecret(decrypted)
  }

  return (
    <WhatsAppForm
      initialData={{
        whatsappPhoneId: restaurant.whatsappPhoneId ?? "",
        whatsappToken: "",
      }}
      maskedToken={maskedToken}
      hasExistingToken={hasToken}
    />
  )
}
