"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
]

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Madrid",
]

type OperatingHours = Record<string, { open: string; close: string } | null>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  // Step 1
  const [restaurantName, setRestaurantName] = useState("")
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires")
  const [maxCapacity, setMaxCapacity] = useState("50")
  const [maxPartySize, setMaxPartySize] = useState("20")

  // Fetch current restaurant data on mount
  useEffect(() => {
    fetch("/api/settings/restaurant")
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.name ?? "")
        if (data.timezone) setTimezone(data.timezone)
        if (data.maxCapacity) setMaxCapacity(String(data.maxCapacity))
        if (data.maxPartySize) setMaxPartySize(String(data.maxPartySize))
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  // Step 2
  const [hours, setHours] = useState<OperatingHours>(() => {
    const defaults: OperatingHours = {}
    DAYS.forEach((d) => {
      defaults[d.key] = d.key === "domingo" ? null : { open: "12:00", close: "23:00" }
    })
    return defaults
  })

  function toggleDay(key: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { open: "12:00", close: "23:00" },
    }))
  }

  function updateHour(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key]!, [field]: value } : { open: "12:00", close: "23:00", [field]: value },
    }))
  }

  async function handleFinish() {
    setLoading(true)
    setError("")

    const operatingHours: Record<string, { open: string; close: string }> = {}
    for (const [key, value] of Object.entries(hours)) {
      if (value) operatingHours[key] = value
    }

    try {
      const res = await fetch("/api/settings/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName,
          timezone,
          maxCapacity: Number(maxCapacity),
          maxPartySize: Number(maxPartySize),
          operatingHours,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al guardar")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Configura tu restaurante
          </CardTitle>
          <CardDescription>
            Paso {step} de 3
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del restaurante</Label>
                <Input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Ej: La Trattoria"
                />
              </div>
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidad maxima del restaurante</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximo de personas por reserva</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxPartySize}
                  onChange={(e) => setMaxPartySize(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!ready}>
                {ready ? "Siguiente" : "Cargando..."}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {DAYS.map((day) => (
                <div key={day.key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!hours[day.key]}
                      onChange={() => toggleDay(day.key)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                  {hours[day.key] ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hours[day.key]!.open}
                        onChange={(e) => updateHour(day.key, "open", e.target.value)}
                        className="w-auto"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={hours[day.key]!.close}
                        onChange={(e) => updateHour(day.key, "close", e.target.value)}
                        className="w-auto"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Cerrado</span>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Atras
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <p><strong>Zona horaria:</strong> {timezone}</p>
                <p><strong>Capacidad:</strong> {maxCapacity} personas</p>
                <p><strong>Max por reserva:</strong> {maxPartySize} personas</p>
                <p><strong>Dias abiertos:</strong> {Object.entries(hours).filter(([, v]) => v).map(([k]) => k).join(", ") || "Ninguno"}</p>
              </div>
              <Button className="w-full" onClick={handleFinish} disabled={loading}>
                {loading ? "Guardando..." : "Ir al dashboard"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                Modificar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
