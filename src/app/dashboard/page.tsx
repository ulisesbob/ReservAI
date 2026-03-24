import { requireSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ReservationList } from "./reservation-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const session = await requireSession()

  const today = new Date()
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const [totalReservations, confirmedCount, totalGuests] = await Promise.all([
    prisma.reservation.count({
      where: { restaurantId: session.restaurantId, dateTime: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.reservation.count({
      where: { restaurantId: session.restaurantId, dateTime: { gte: dayStart, lte: dayEnd }, status: "CONFIRMED" },
    }),
    prisma.reservation.aggregate({
      where: { restaurantId: session.restaurantId, dateTime: { gte: dayStart, lte: dayEnd } },
      _sum: { partySize: true },
    }),
  ])

  const dateLabel = today.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const todayStr = today.toISOString().split("T")[0]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight capitalize">{dateLabel}</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalReservations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comensales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{totalGuests._sum.partySize ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <ReservationList defaultDate={todayStr} />
      </div>
    </div>
  )
}
