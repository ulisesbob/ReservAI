import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RestaurantForm } from "./restaurant-form"

export default async function RestaurantSettingsPage() {
  const session = await requireAdmin()

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      name: true,
      slug: true,
      timezone: true,
      maxCapacity: true,
      maxPartySize: true,
      operatingHours: true,
      defaultDurationMinutes: true,
      address: true,
    },
  })

  return (
    <RestaurantForm
      initialData={{
        name: restaurant.name,
        slug: restaurant.slug,
        timezone: restaurant.timezone,
        maxCapacity: restaurant.maxCapacity,
        maxPartySize: restaurant.maxPartySize,
        operatingHours: (restaurant.operatingHours as Record<string, { open: string; close: string }>) ?? {},
        defaultDurationMinutes: restaurant.defaultDurationMinutes,
        address: restaurant.address,
      }}
    />
  )
}
