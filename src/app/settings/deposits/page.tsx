import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DepositForm } from "./deposit-form"

export default async function DepositSettingsPage() {
  const session = await requireAdmin()

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      depositEnabled: true,
      depositAmount: true,
      depositMinPartySize: true,
    },
  })

  return (
    <DepositForm
      initialData={{
        depositEnabled: restaurant.depositEnabled,
        depositAmount: restaurant.depositAmount,
        depositMinPartySize: restaurant.depositMinPartySize,
      }}
    />
  )
}
