"use client"

import { useMemo } from "react"
import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarDays, Clock, Users, Phone, MessageSquare } from "lucide-react"
import { getStatusColors, getStatusLabel } from "@/lib/status-colors"

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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08:00 - 23:00

export function CalendarDayView({
  currentDate,
  reservations,
  onStatusChange,
}: {
  currentDate: Date
  reservations: Reservation[]
  onStatusChange?: (id: string, status: string) => void
}) {
  const dayReservations = useMemo(() => {
    return reservations
      .filter((r) => isSameDay(new Date(r.dateTime), currentDate))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  }, [reservations, currentDate])

  const byHour = useMemo(() => {
    const map = new Map<number, Reservation[]>()
    for (const r of dayReservations) {
      const h = new Date(r.dateTime).getHours()
      const list = map.get(h) || []
      list.push(r)
      map.set(h, list)
    }
    return map
  }, [dayReservations])

  const stats = useMemo(() => {
    const active = dayReservations.filter((r) => r.status !== "CANCELLED")
    return {
      total: active.length,
      confirmed: active.filter((r) => r.status === "CONFIRMED").length,
      pending: active.filter((r) => r.status === "PENDING" || r.status === "PENDING_DEPOSIT").length,
      guests: active.reduce((sum, r) => sum + r.partySize, 0),
    }
  }, [dayReservations])

  return (
    <div className="space-y-4">
      {/* Day header with stats */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold capitalize">
          {format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            {stats.confirmed} confirmadas
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            {stats.pending} pendientes
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {stats.guests} personas
          </span>
        </div>
      </div>

      {/* Timeline */}
      {dayReservations.length === 0 ? (
        <div className="border rounded-lg bg-background py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/25 mx-auto mb-4" />
          <p className="text-base font-medium text-muted-foreground">Dia libre</p>
          <p className="text-sm text-muted-foreground/60 mt-1">No hay reservas para este dia</p>
        </div>
      ) : (
      <div className="border rounded-lg overflow-hidden bg-background">
        <ScrollArea className="h-[600px]">
          <div className="divide-y">
            {HOURS.map((hour) => {
              const hourReservations = byHour.get(hour) || []
              const hasReservations = hourReservations.length > 0

              return (
                <div
                  key={hour}
                  className={`grid grid-cols-[70px_1fr] min-h-[60px] ${
                    hasReservations ? "" : "opacity-60"
                  }`}
                >
                  {/* Time label */}
                  <div className="border-r px-3 py-2 text-sm font-medium text-muted-foreground flex items-start">
                    {`${hour.toString().padStart(2, "0")}:00`}
                  </div>

                  {/* Reservations */}
                  <div className="p-2 space-y-2">
                    {hourReservations.map((r) => {
                      const style = getStatusColors(r.status)

                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-l-4 bg-muted/40 hover:bg-muted/70 transition-colors ${
                            r.status === "CANCELLED"
                              ? "border-l-red-400 opacity-50"
                              : r.status === "CONFIRMED"
                              ? "border-l-emerald-500"
                              : r.status === "PENDING"
                              ? "border-l-yellow-400"
                              : "border-l-gray-400"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{r.customerName}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 rounded-full ${style.badge}`}
                                >
                                  {getStatusLabel(r.status)}
                                </Badge>
                                {r.source === "WHATSAPP" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-transparent bg-blue-100 text-blue-800"
                                  >
                                    <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                                    WA
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(r.dateTime), "HH:mm")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {r.partySize} personas
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {r.customerPhone}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {(r.status === "PENDING" || r.status === "PENDING_DEPOSIT") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                onClick={() => onStatusChange?.(r.id, "CONFIRMED")}
                              >
                                Confirmar
                              </Button>
                            )}
                            {(r.status === "PENDING" || r.status === "PENDING_DEPOSIT" || r.status === "CONFIRMED") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onStatusChange?.(r.id, "CANCELLED")}
                              >
                                Cancelar
                              </Button>
                            )}
                            {r.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                onClick={() => onStatusChange?.(r.id, "COMPLETED")}
                              >
                                Completar
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
      )}
    </div>
  )
}
