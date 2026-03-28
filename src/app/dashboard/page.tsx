import { requireSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardViewToggle } from "./dashboard-view-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { GettingStartedCard } from "@/components/getting-started-card"
import { CalendarDays, Users } from "lucide-react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos dias"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export default async function DashboardPage() {
  const session = await requireSession()

  const today = new Date()
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const [totalReservations, confirmedCount, totalGuests, restaurant, anyReservation] =
    await Promise.all([
      prisma.reservation.count({
        where: { restaurantId: session.restaurantId, dateTime: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.reservation.count({
        where: {
          restaurantId: session.restaurantId,
          dateTime: { gte: dayStart, lte: dayEnd },
          status: "CONFIRMED",
        },
      }),
      prisma.reservation.aggregate({
        where: { restaurantId: session.restaurantId, dateTime: { gte: dayStart, lte: dayEnd } },
        _sum: { partySize: true },
      }),
      prisma.restaurant.findUniqueOrThrow({
        where: { id: session.restaurantId },
        select: { whatsappToken: true, slug: true },
      }),
      prisma.reservation.findFirst({
        where: { restaurantId: session.restaurantId },
        select: { id: true },
      }),
    ])

  const hasWhatsApp = !!restaurant.whatsappToken
  const hasReservation = !!anyReservation
  const showOnboarding = !hasWhatsApp || !hasReservation

  const dateLabel = today.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const todayStr = today.toISOString().split("T")[0]
  const greeting = getGreeting()
  const firstName = session.name?.split(" ")[0] ?? ""

  return (
    <div>
      {/* Header: Greeting + date */}
      <div className="pb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{dateLabel}</p>
      </div>

      {showOnboarding && (
        <div className="mt-6">
          <GettingStartedCard
            hasWhatsApp={hasWhatsApp}
            hasReservation={hasReservation}
            slug={restaurant.slug}
          />
        </div>
      )}

      {/* Stats: Hero stat + secondary stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* HERO stat */}
        <Card className="sm:col-span-1">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm font-medium text-muted-foreground">Total reservas hoy</p>
            <p className="text-5xl font-black tracking-tight mt-1">{totalReservations}</p>
          </CardContent>
        </Card>

        {/* Secondary stats — visually subdued */}
        <Card className="sm:col-span-1">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              Confirmadas
            </p>
            <p className="text-2xl font-semibold text-muted-foreground mt-1">{confirmedCount}</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Comensales
            </p>
            <p className="text-2xl font-semibold text-muted-foreground mt-1">{totalGuests._sum.partySize ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <DashboardViewToggle defaultDate={todayStr} />
      </div>
    </div>
  )
}
