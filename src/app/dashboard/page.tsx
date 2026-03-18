import { requireSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ReservationList } from "./reservation-list"

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
      {/* Date header */}
      <h1 className="text-2xl font-bold text-gray-900 capitalize">{dateLabel}</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total reservas</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalReservations}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Confirmadas</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{confirmedCount}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Comensales</p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{totalGuests}</p>
        </div>
      </div>

      {/* Reservation list (client component) */}
      <div className="mt-8">
        <ReservationList reservations={serialized} />
      </div>
    </div>
  )
}
