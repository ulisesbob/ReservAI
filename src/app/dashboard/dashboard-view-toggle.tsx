"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CalendarDays, List } from "lucide-react"
import { ReservationList } from "./reservation-list"
import { ReservationCalendar } from "./reservation-calendar"

export function DashboardViewToggle({ defaultDate }: { defaultDate: string }) {
  const [view, setView] = useState<"calendar" | "list">("calendar")

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Reservas</h2>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 gap-1.5"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 gap-1.5"
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </Button>
        </div>
      </div>

      {view === "calendar" ? (
        <ReservationCalendar />
      ) : (
        <ReservationList defaultDate={defaultDate} />
      )}
    </div>
  )
}
