"use client"

import { useState, useEffect, useCallback } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, CalendarDays, Users, Clock } from "lucide-react"
import { ReservationForm } from "./reservation-form"

type Reservation = {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  source: string
}

type DaySummary = {
  date: Date
  reservations: Reservation[]
  confirmed: number
  pending: number
  totalGuests: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-400",
  CONFIRMED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
  COMPLETED: "bg-gray-400",
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "border-yellow-500 text-yellow-700 bg-yellow-50",
  CONFIRMED: "border-transparent bg-emerald-100 text-emerald-800",
  CANCELLED: "border-transparent bg-red-100 text-red-800",
  COMPLETED: "border-transparent bg-gray-100 text-gray-700",
}

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

export function ReservationCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchReservations = useCallback(async () => {
    try {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      // Fetch all reservations for the visible month range
      // We fetch day by day in a range — or better, fetch all at once with a large limit
      const params = new URLSearchParams({
        page: "1",
        limit: "500",
      })

      // Fetch all reservations (the API filters by restaurant via session)
      const res = await fetch(`/api/reservations?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()

      // Filter to current month on client side
      const monthReservations = (json.data as Reservation[]).filter((r) => {
        const d = new Date(r.dateTime)
        return d >= monthStart && d <= monthEnd
      })

      setReservations(monthReservations)
    } catch (err) {
      console.error("Calendar fetch error:", err)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Group reservations by day
  const daySummaries: Map<string, DaySummary> = new Map()
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd")
    const dayReservations = reservations.filter((r) =>
      isSameDay(new Date(r.dateTime), day)
    )
    daySummaries.set(key, {
      date: day,
      reservations: dayReservations,
      confirmed: dayReservations.filter((r) => r.status === "CONFIRMED").length,
      pending: dayReservations.filter((r) => r.status === "PENDING").length,
      totalGuests: dayReservations
        .filter((r) => r.status !== "CANCELLED")
        .reduce((sum, r) => sum + r.partySize, 0),
    })
  }

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null
  const selectedSummary = selectedDayKey ? daySummaries.get(selectedDayKey) : null

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchReservations()
      }
    } catch (err) {
      console.error("Status update error:", err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date())
              setSelectedDay(new Date())
            }}
          >
            Hoy
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <Button size="sm" onClick={() => setShowForm(true)}>
              + Nueva reserva
            </Button>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva reserva</DialogTitle>
              </DialogHeader>
              <ReservationForm
                onSuccess={() => {
                  setShowForm(false)
                  fetchReservations()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const summary = daySummaries.get(key)!
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const today = isToday(day)
            const hasReservations = summary.reservations.length > 0

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`
                  relative min-h-[80px] p-1.5 border-b border-r text-left transition-colors
                  hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
                  ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : ""}
                  ${isSelected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}
                `}
              >
                {/* Day number */}
                <span
                  className={`
                    inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                    ${today ? "bg-primary text-primary-foreground" : ""}
                  `}
                >
                  {format(day, "d")}
                </span>

                {/* Reservation indicators */}
                {hasReservations && isCurrentMonth && (
                  <div className="mt-0.5 space-y-0.5">
                    {summary.confirmed > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-emerald-700 font-medium">
                          {summary.confirmed}
                        </span>
                      </div>
                    )}
                    {summary.pending > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                        <span className="text-[10px] text-yellow-700 font-medium">
                          {summary.pending}
                        </span>
                      </div>
                    )}
                    {summary.totalGuests > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {summary.totalGuests}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Confirmadas
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          Pendientes
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          Personas
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && selectedSummary && (
        <div className="border rounded-lg p-4 bg-background">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold capitalize">
              {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {selectedSummary.reservations.filter((r) => r.status !== "CANCELLED").length} reservas
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {selectedSummary.totalGuests} personas
              </span>
            </div>
          </div>

          {selectedSummary.reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay reservas para este dia
            </p>
          ) : (
            <div className="space-y-2">
              {selectedSummary.reservations
                .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[r.status] || "bg-gray-400"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.customerName}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[r.status] || ""}`}
                          >
                            {r.status}
                          </Badge>
                          {r.source === "WHATSAPP" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-transparent bg-blue-100 text-blue-800">
                              WA
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(r.dateTime), "HH:mm")}
                          <span>|</span>
                          <Users className="h-3 w-3" />
                          {r.partySize}p
                          <span>|</span>
                          {r.customerPhone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          onClick={() => handleStatusChange(r.id, "CONFIRMED")}
                        >
                          Confirmar
                        </Button>
                      )}
                      {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleStatusChange(r.id, "CANCELLED")}
                        >
                          Cancelar
                        </Button>
                      )}
                      {r.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() => handleStatusChange(r.id, "COMPLETED")}
                        >
                          Completar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
