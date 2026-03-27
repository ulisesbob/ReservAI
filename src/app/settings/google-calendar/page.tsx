import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listCalendars } from "@/lib/google-calendar"
import { GoogleCalendarForm } from "./google-calendar-form"

export default async function GoogleCalendarSettingsPage() {
  const session = await requireAdmin()

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      googleCalendarToken: true,
      googleCalendarId: true,
      googleCalendarEnabled: true,
    },
  })

  const connected = !!restaurant.googleCalendarToken

  let calendars: Array<{ id: string; summary: string; primary: boolean }> = []
  if (connected && restaurant.googleCalendarToken) {
    calendars = await listCalendars(restaurant.googleCalendarToken)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Google Calendar</h2>
        <p className="text-muted-foreground">
          Sincroniza automaticamente las reservas con tu Google Calendar.
        </p>
      </div>
      <GoogleCalendarForm
        connected={connected}
        enabled={restaurant.googleCalendarEnabled}
        calendarId={restaurant.googleCalendarId ?? null}
        calendars={calendars}
      />
    </div>
  )
}
