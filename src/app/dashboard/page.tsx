import { requireSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ReservationList } from "./reservation-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const session = await requireSession()

  const today = new Date()
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId: session.restaurantId,
      dateTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { dateTime: "asc" },
  })

  // Serialize dates to ISO strings for client component
  const serialized = reservations.map((r) => ({
    ...r,
    dateTime: r.dateTime.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  const totalReservations = reservations.length
  const confirmedCount = reservations.filter((r) => r.status === "CONFIRMED").length
  const totalGuests = reservations.reduce((sum, r) => sum + r.partySize, 0)

  const dateLabel = today.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

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
            <p className="text-3xl font-bold text-primary">{totalGuests}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <ReservationList reservations={serialized} />
      </div>
    </div>
  )
}
