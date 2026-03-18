"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Rome",
]

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
]

type OperatingHours = Record<string, { open: string; close: string }>

interface RestaurantFormProps {
  initialData: {
    name: string
    slug: string
    timezone: string
    maxCapacity: number
    maxPartySize: number
    operatingHours: OperatingHours
  }
}

export function RestaurantForm({ initialData }: RestaurantFormProps) {
  const [name, setName] = useState(initialData.name)
  const [timezone, setTimezone] = useState(initialData.timezone)
  const [maxCapacity, setMaxCapacity] = useState(initialData.maxCapacity)
  const [maxPartySize, setMaxPartySize] = useState(initialData.maxPartySize)
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    initialData.operatingHours
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function toggleDay(day: string, enabled: boolean) {
    setOperatingHours((prev) => {
      if (enabled) {
        return { ...prev, [day]: { open: "12:00", close: "23:00" } }
      }
      const next = { ...prev }
      delete next[day]
      return next
    })
  }

  function updateHour(day: string, field: "open" | "close", value: string) {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          maxCapacity,
          maxPartySize,
          operatingHours,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({ type: "success", text: "Configuracion guardada correctamente." })
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del restaurante</CardTitle>
          <CardDescription>
            Configura el nombre, zona horaria y capacidad de tu restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={initialData.slug} disabled />
              <p className="text-xs text-muted-foreground">
                El slug no se puede modificar.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxCapacity">Capacidad maxima (personas)</Label>
              <Input
                id="maxCapacity"
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPartySize">
                Maximo por reserva (personas)
              </Label>
              <Input
                id="maxPartySize"
                type="number"
                min={1}
                value={maxPartySize}
                onChange={(e) => setMaxPartySize(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de atencion</CardTitle>
          <CardDescription>
            Configura los dias y horarios en los que tu restaurante esta abierto.
            Los dias sin horario se consideran cerrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const isOpen = day.key in operatingHours
            return (
              <div
                key={day.key}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 py-2 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3 sm:w-40">
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => toggleDay(day.key, checked)}
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
                {isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={operatingHours[day.key]?.open ?? "12:00"}
                      onChange={(e) =>
                        updateHour(day.key, "open", e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={operatingHours[day.key]?.close ?? "23:00"}
                      onChange={(e) =>
                        updateHour(day.key, "close", e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-600"
              : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  )
}
