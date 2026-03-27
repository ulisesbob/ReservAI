"use client"

import { useMemo } from "react"
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Users } from "lucide-react"

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

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", border: "border-l-yellow-400", text: "text-yellow-800" },
  CONFIRMED: { bg: "bg-emerald-100", border: "border-l-emerald-500", text: "text-emerald-800" },
  CANCELLED: { bg: "bg-red-100", border: "border-l-red-400", text: "text-red-700" },
  COMPLETED: { bg: "bg-gray-100", border: "border-l-gray-400", text: "text-gray-600" },
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08:00 - 23:00

export function CalendarWeekView({
  currentDate,
  reservations,
  onSelectReservation,
}: {
  currentDate: Date
  reservations: Reservation[]
  onSelectReservation?: (reservation: Reservation) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const reservationsByDayHour = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of reservations) {
      if (r.status === "CANCELLED") continue
      const dt = new Date(r.dateTime)
      for (const day of weekDays) {
        if (isSameDay(dt, day)) {
          const key = `${format(day, "yyyy-MM-dd")}-${dt.getHours()}`
          const list = map.get(key) || []
          list.push(r)
          map.set(key, list)
          break
        }
      }
    }
    return map
  }, [reservations, weekDays])

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
        <div className="border-r" />
        {weekDays.map((day) => {
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={`px-2 py-2 text-center border-r last:border-r-0 ${today ? "bg-primary/5" : ""}`}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "EEE", { locale: es })}
              </div>
              <div
                className={`text-sm font-semibold mt-0.5 ${
                  today
                    ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                    : ""
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="border-r border-b px-2 py-1 text-xs text-muted-foreground text-right pr-3 h-16 flex items-start justify-end pt-0 -mt-2">
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const key = `${format(day, "yyyy-MM-dd")}-${hour}`
                const cellReservations = reservationsByDayHour.get(key) || []
                const today = isToday(day)

                return (
                  <div
                    key={key}
                    className={`border-r border-b last:border-r-0 h-16 p-0.5 relative ${
                      today ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {cellReservations.map((r) => {
                      const colors = STATUS_COLORS[r.status] || STATUS_COLORS.COMPLETED
                      return (
                        <Tooltip key={r.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onSelectReservation?.(r)}
                              className={`w-full text-left px-1.5 py-0.5 rounded-sm border-l-2 mb-0.5 text-[10px] leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity ${colors.bg} ${colors.border} ${colors.text}`}
                            >
                              <div className="font-medium truncate">
                                {format(new Date(r.dateTime), "HH:mm")} {r.customerName}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-75">
                                <Users className="h-2.5 w-2.5" />
                                {r.partySize}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">{r.customerName}</p>
                            <p>{format(new Date(r.dateTime), "HH:mm")} · {r.partySize} personas</p>
                            <p className="capitalize">{r.status.toLowerCase()} · {r.source === "WHATSAPP" ? "WhatsApp" : "Manual"}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
