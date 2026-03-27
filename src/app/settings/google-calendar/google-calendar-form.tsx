"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, CalendarDays, CheckCircle2, XCircle } from "lucide-react"

interface Calendar {
  id: string
  summary: string
  primary: boolean
}

interface GoogleCalendarFormProps {
  connected: boolean
  enabled: boolean
  calendarId: string | null
  calendars: Calendar[]
}

export function GoogleCalendarForm({
  connected: initialConnected,
  enabled: initialEnabled,
  calendarId: initialCalendarId,
  calendars: initialCalendars,
}: GoogleCalendarFormProps) {
  const router = useRouter()

  const [connected, setConnected] = useState(initialConnected)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [calendarId, setCalendarId] = useState(initialCalendarId ?? "")
  const [calendars] = useState<Calendar[]>(initialCalendars)

  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleConnect() {
    // Redirect to OAuth flow
    window.location.href = "/api/auth/google-calendar"
  }

  async function handleDisconnect() {
    if (!confirm("Seguro que quieres desconectar Google Calendar? Se dejaran de sincronizar las reservas.")) return

    setDisconnecting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/google-calendar", { method: "DELETE" })
      if (!res.ok) throw new Error("Error al desconectar")
      setConnected(false)
      setEnabled(false)
      setCalendarId("")
      setMessage({ type: "success", text: "Google Calendar desconectado correctamente." })
      router.refresh()
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al desconectar" })
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/google-calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          calendarId: calendarId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({ type: "success", text: "Configuracion guardada correctamente." })
      router.refresh()
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Conexion con Google Calendar
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta de Google para sincronizar reservas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Conectado a Google Calendar
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  No conectado
                </span>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings card — only shown when connected */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle>Configuracion de sincronizacion</CardTitle>
            <CardDescription>
              Elige en que calendario se crean los eventos y si la sincronizacion esta activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gcal-enabled" className="text-base">
                  Sincronizacion activa
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las nuevas reservas, cambios y cancelaciones se sincronizaran con Google Calendar.
                </p>
              </div>
              <Switch
                id="gcal-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {/* Calendar selector */}
            {calendars.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="gcal-calendar">Calendario destino</Label>
                <select
                  id="gcal-calendar"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Calendario principal (por defecto)</option>
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                      {cal.primary ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selecciona el calendario donde se crearan los eventos de reservas.
                </p>
              </div>
            )}

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

            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar configuracion
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show message even when disconnected (for errors) */}
      {!connected && message && (
        <p
          className={
            message.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
