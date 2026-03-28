"use client"

import { useState, useEffect, useRef } from "react"
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
import { Loader2, Copy, Check, Download, QrCode } from "lucide-react"
import QRCode from "qrcode"

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
    defaultDurationMinutes: number
    address?: string | null
  }
}

export function RestaurantForm({ initialData }: RestaurantFormProps) {
  const [name, setName] = useState(initialData.name)
  const [address, setAddress] = useState(initialData.address ?? "")
  const [timezone, setTimezone] = useState(initialData.timezone)
  const [maxCapacity, setMaxCapacity] = useState(initialData.maxCapacity)
  const [maxPartySize, setMaxPartySize] = useState(initialData.maxPartySize)
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(initialData.defaultDurationMinutes)
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    initialData.operatingHours
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const bookingUrl = `https://reservasai.com/book/${initialData.slug}`

  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, bookingUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
    }
  }, [bookingUrl])

  function handleCopyLink() {
    navigator.clipboard.writeText(bookingUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function handleDownloadQR() {
    if (!qrCanvasRef.current) return
    const link = document.createElement("a")
    link.download = `qr-reservas-${initialData.slug}.png`
    link.href = qrCanvasRef.current.toDataURL("image/png")
    link.click()
  }

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
          address: address.trim() || null,
          timezone,
          maxCapacity,
          maxPartySize,
          defaultDurationMinutes,
          operatingHours,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({ type: "success", text: "Configuración guardada correctamente." })
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

          {/* Booking link + QR code */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Link de reservas</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={bookingUrl}
                readOnly
                className="text-sm bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1.5">{linkCopied ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadQR}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Descargar QR
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Imprimí este QR y ponelo en tu restaurante para que los clientes reserven fácil.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Corrientes 1234, CABA"
            />
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

          <div className="grid gap-4 sm:grid-cols-3">
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
            <div className="space-y-2">
              <Label htmlFor="defaultDurationMinutes">
                Duración estimada (minutos)
              </Label>
              <Input
                id="defaultDurationMinutes"
                type="number"
                min={15}
                max={480}
                step={15}
                value={defaultDurationMinutes}
                onChange={(e) => setDefaultDurationMinutes(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Se muestra al cliente en la confirmación.
              </p>
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
