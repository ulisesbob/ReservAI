"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"

interface RestaurantInfo {
  name: string
  slug: string
  maxPartySize: number
}

type Step = "form" | "loading" | "success" | "error"

export default function WidgetPage() {
  const { slug } = useParams<{ slug: string }>()

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [errorMsg, setErrorMsg] = useState("")

  // Form state
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [partySize, setPartySize] = useState(2)

  // Min date = today
  const today = new Date().toISOString().split("T")[0]

  // Fetch restaurant info on mount
  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.restaurant) setRestaurant(data.restaurant)
        else setErrorMsg("Restaurante no encontrado")
      })
      .catch(() => setErrorMsg("Error al cargar"))
  }, [slug])

  // Fetch time slots when date changes
  const fetchSlots = useCallback(
    async (selectedDate: string) => {
      setLoadingSlots(true)
      setTime("")
      try {
        const res = await fetch(`/api/book/${slug}?date=${selectedDate}`)
        const data = await res.json()
        setTimeSlots(data.timeSlots || [])
      } catch {
        setTimeSlots([])
      } finally {
        setLoadingSlots(false)
      }
    },
    [slug]
  )

  useEffect(() => {
    if (date) fetchSlots(date)
  }, [date, fetchSlots])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep("loading")
    setErrorMsg("")

    try {
      const res = await fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          dateTime: `${date}T${time}:00`,
          partySize,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || "Error al reservar")
        setStep("error")
        return
      }

      setStep("success")
    } catch {
      setErrorMsg("Error de conexión")
      setStep("error")
    }
  }

  // Loading state
  if (!restaurant && !errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-pulse text-sm text-gray-500">Cargando...</div>
      </div>
    )
  }

  // Restaurant not found
  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-sm text-red-500">{errorMsg}</p>
      </div>
    )
  }

  // Success state
  if (step === "success") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-3 max-w-xs">
          <div className="text-4xl">&#10003;</div>
          <h2 className="text-lg font-semibold text-gray-900">
            Reserva enviada
          </h2>
          <p className="text-sm text-gray-600">
            Tu reserva en <strong>{restaurant.name}</strong> para{" "}
            <strong>{partySize}</strong> persona{partySize > 1 ? "s" : ""} el{" "}
            <strong>{date}</strong> a las <strong>{time}</strong> fue registrada.
            Recibirás confirmación pronto.
          </p>
          <button
            onClick={() => {
              setStep("form")
              setName("")
              setPhone("")
              setEmail("")
              setDate("")
              setTime("")
              setPartySize(2)
            }}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 underline"
          >
            Hacer otra reserva
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-6">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">
          Reservar en {restaurant.name}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label
              htmlFor="w-name"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Nombre *
            </label>
            <input
              id="w-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="w-phone"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Teléfono *
            </label>
            <input
              id="w-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 11 1234-5678"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Email (optional) */}
          <div>
            <label
              htmlFor="w-email"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="w-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Date + Party Size row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="w-date"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Fecha *
              </label>
              <input
                id="w-date"
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="w-party"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Personas *
              </label>
              <select
                id="w-party"
                required
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                {Array.from(
                  { length: restaurant.maxPartySize },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persona" : "personas"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time slot */}
          {date && (
            <div>
              <label
                htmlFor="w-time"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Horario *
              </label>
              {loadingSlots ? (
                <p className="text-xs text-gray-500 py-2">
                  Cargando horarios...
                </p>
              ) : timeSlots.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  No hay horarios disponibles para esta fecha.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        time === slot
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {step === "error" && errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!name || !phone || !date || !time || step === "loading"}
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {step === "loading" ? "Reservando..." : "Confirmar reserva"}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center mt-4">
          Powered by ReservasAI
        </p>
      </div>
    </div>
  )
}
