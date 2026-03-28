"use client"

import { useState, useEffect } from "react"
import {
  format,
  addDays,
  addMinutes,
  startOfDay,
  isBefore,
  eachDayOfInterval,
  addMonths,
  parse,
} from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Users,
  Check,
  Loader2,
  Banknote,
} from "lucide-react"

const SPANISH_DAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
}

type Step = "date" | "time" | "details" | "success" | "deposit"

export function BookingForm({
  slug,
  maxPartySize,
  openDays,
  depositEnabled,
  depositAmount,
  depositMinPartySize,
  defaultDurationMinutes,
  address,
}: {
  slug: string
  maxPartySize: number
  openDays: string[]
  depositEnabled: boolean
  depositAmount: number
  depositMinPartySize: number
  defaultDurationMinutes: number
  address: string | null
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>("date")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [partySize, setPartySize] = useState(2)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Form fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Calendar state — initialised lazily to avoid SSR/client mismatch
  const [calendarStart, setCalendarStart] = useState<Date>(() => startOfDay(new Date()))

  useEffect(() => {
    setMounted(true)
  }, [])

  const today = startOfDay(new Date())

  // Open day numbers (0=sun, 1=mon, etc.)
  const openDayNumbers = openDays.map((d) => SPANISH_DAYS[d]).filter((n) => n !== undefined)

  // Generate 14 days from calendarStart
  const visibleDays = eachDayOfInterval({
    start: calendarStart,
    end: addDays(calendarStart, 13),
  })

  // Fetch time slots when date changes
  useEffect(() => {
    if (!selectedDate) return

    const fetchSlots = async () => {
      setLoadingSlots(true)
      setTimeSlots([])
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd")
        const res = await fetch(`/api/book/${slug}?date=${dateStr}`)
        if (res.ok) {
          const data = await res.json()
          setTimeSlots(data.timeSlots || [])
        }
      } catch {
        setTimeSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, slug])

  const requiresDeposit = depositEnabled && partySize >= depositMinPartySize && depositAmount > 0

  function getEstimatedEndTime(time: string): string {
    const parsed = parse(time, "HH:mm", new Date())
    const end = addMinutes(parsed, defaultDurationMinutes)
    return format(end, "HH:mm")
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !name || !phone) return
    setSubmitting(true)
    setError("")

    try {
      const dateTime = `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
      const res = await fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          dateTime,
          partySize,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al crear la reserva")
        return
      }

      // If the reservation requires a deposit, go to deposit step
      if (data.requiresDeposit && data.reservation?.id) {
        setReservationId(data.reservation.id)
        setStep("deposit")
      } else {
        setStep("success")
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  const [reservationId, setReservationId] = useState<string | null>(null)
  const [depositLoading, setDepositLoading] = useState(false)

  const handlePayDeposit = async () => {
    if (!reservationId) return
    setDepositLoading(true)
    setError("")

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          payerEmail: email || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al procesar el pago")
        return
      }

      if (data.initPoint) {
        window.location.href = data.initPoint
      } else {
        setError("No se recibio el enlace de pago. Intenta de nuevo.")
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setDepositLoading(false)
    }
  }

  if (step === "deposit") {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Banknote className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold">Sena requerida</h2>
          <div className="text-muted-foreground space-y-1">
            <p className="capitalize">
              {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p>{selectedTime} hs — {partySize} {partySize === 1 ? "persona" : "personas"}</p>
            <p className="font-medium text-foreground">{name}</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              Para reservas de {depositMinPartySize} o mas personas se requiere una sena de{" "}
              <span className="font-bold">${depositAmount.toLocaleString("es-AR")} ARS</span>.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              La sena se descuenta de tu cuenta al llegar al restaurante.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full h-11"
            onClick={handlePayDeposit}
            disabled={depositLoading}
          >
            {depositLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Pagar sena — ${depositAmount.toLocaleString("es-AR")} ARS
          </Button>

          <p className="text-xs text-muted-foreground">
            Seras redirigido a MercadoPago para completar el pago.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (step === "success") {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold">Reserva confirmada</h2>
          <div className="text-muted-foreground space-y-1">
            <p className="capitalize">
              {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p>
              <Clock className="inline h-3.5 w-3.5 mr-1" />
              {selectedTime} — ~{selectedTime && getEstimatedEndTime(selectedTime)} hs ({defaultDurationMinutes} min estimados)
            </p>
            <p>{partySize} {partySize === 1 ? "persona" : "personas"}</p>
            <p className="font-medium text-foreground">{name}</p>
            {address && (
              <p className="text-sm">Dirección: {address}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Tu reserva esta pendiente de confirmacion. Te avisaremos por WhatsApp.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStep("date")
              setSelectedDate(null)
              setSelectedTime(null)
              setName("")
              setPhone("")
              setEmail("")
              setReservationId(null)
            }}
          >
            Hacer otra reserva
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Party size */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            Cantidad de personas
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={partySize <= 1}
              onClick={() => setPartySize((p) => Math.max(1, p - 1))}
            >
              -
            </Button>
            <span className="text-lg font-semibold w-8 text-center">{partySize}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={partySize >= maxPartySize}
              onClick={() => setPartySize((p) => Math.min(maxPartySize, p + 1))}
            >
              +
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              Max {maxPartySize}
            </span>
          </div>
        </div>

        {/* Step 1: Date selection — rendered only after mount to avoid hydration mismatch */}
        {!mounted && (step === "date" || step === "time" || step === "details") && (
          <div className="h-[160px] rounded-lg bg-muted/40 animate-pulse" aria-hidden="true" />
        )}
        {mounted && (step === "date" || step === "time" || step === "details") && (
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4" />
              Elegí el dia
            </Label>

            {/* Date carousel navigation */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isBefore(calendarStart, addDays(today, 1))}
                onClick={() => setCalendarStart(addDays(calendarStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground flex-1 text-center">
                {format(calendarStart, "MMM yyyy", { locale: es })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isBefore(addMonths(today, 2), calendarStart)}
                onClick={() => setCalendarStart(addDays(calendarStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date pills */}
            <div className="grid grid-cols-7 gap-1" role="listbox" aria-label="Dias disponibles">
              {visibleDays.map((day) => {
                const dayOfWeek = day.getDay()
                const isOpen = openDayNumbers.includes(dayOfWeek)
                const isPast = isBefore(day, today)
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                const disabled = !isOpen || isPast

                return (
                  <button
                    key={day.toISOString()}
                    role="option"
                    aria-selected={!!isSelected}
                    aria-label={format(day, "EEEE d 'de' MMMM", { locale: es })}
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDate(day)
                      setSelectedTime(null)
                      setStep("time")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        if (!disabled) {
                          setSelectedDate(day)
                          setSelectedTime(null)
                          setStep("time")
                        }
                      }
                    }}
                    className={`
                      flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors motion-reduce:transition-none
                      ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-accent cursor-pointer"}
                      ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                    `}
                  >
                    <span className="uppercase font-medium">
                      {format(day, "EEE", { locale: es }).slice(0, 3)}
                    </span>
                    <span className="text-lg font-bold mt-0.5">
                      {format(day, "d")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Time selection */}
        {(step === "time" || step === "details") && selectedDate && (
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              Elegí la hora —{" "}
              <span className="capitalize font-normal text-muted-foreground">
                {format(selectedDate, "EEE d MMM", { locale: es })}
              </span>
            </Label>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-6" role="status" aria-live="polite">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="sr-only">Cargando horarios disponibles</span>
              </div>
            ) : timeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay horarios disponibles para este dia
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5" role="listbox" aria-label="Horarios disponibles">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    role="option"
                    aria-selected={selectedTime === time}
                    aria-label={`${time} horas`}
                    onClick={() => {
                      setSelectedTime(time)
                      setStep("details")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedTime(time)
                        setStep("details")
                      }
                    }}
                    className={`
                      py-2 px-2 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none
                      ${selectedTime === time
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                      }
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contact details */}
        {step === "details" && selectedTime && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p>
                <span className="capitalize">
                  {format(selectedDate!, "EEEE d 'de' MMMM", { locale: es })}
                </span>
                {" — "}
                {partySize} {partySize === 1 ? "persona" : "personas"}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold">{selectedTime}</span>
                {" — ~"}
                <span className="font-semibold">{getEstimatedEndTime(selectedTime)} hs</span>
                <span className="text-muted-foreground ml-1">({defaultDurationMinutes} min estimados)</span>
              </p>
            </div>

            <div>
              <Label htmlFor="name">Nombre <span aria-label="requerido">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                aria-required="true"
                aria-describedby={error ? "error-form" : undefined}
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefono <span aria-label="requerido">*</span></Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
                required
                aria-required="true"
                aria-describedby={error ? "error-form" : undefined}
              />
            </div>

            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            {error && (
              <div id="error-form" role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {requiresDeposit && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <Banknote className="h-4 w-4 flex-shrink-0" />
                <span>
                  Se requiere una sena de <strong>${depositAmount.toLocaleString("es-AR")} ARS</strong> para esta reserva.
                </span>
              </div>
            )}

            <Button
              className="w-full h-11"
              disabled={!name || !phone || submitting}
              onClick={handleSubmit}
              aria-busy={submitting}
            >
              {submitting ? (
                <span role="status" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="sr-only">Enviando reserva</span>
                </span>
              ) : null}
              {requiresDeposit ? "Continuar al pago de sena" : "Confirmar reserva"}
            </Button>

            <button
              onClick={() => setStep("time")}
              className="text-xs text-muted-foreground underline w-full text-center"
            >
              Cambiar horario
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
