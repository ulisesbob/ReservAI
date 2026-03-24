"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ReservationForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      customerName: form.get("customerName") as string,
      customerPhone: form.get("customerPhone") as string,
      customerEmail: (form.get("customerEmail") as string) || undefined,
      dateTime: form.get("dateTime") as string,
      partySize: Number(form.get("partySize")),
    }

    if (!body.customerName || !body.customerPhone || !body.dateTime || !body.partySize) {
      setError("Completa todos los campos requeridos.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al crear la reserva")
        return
      }

      onSuccess()
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" aria-live="polite" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nombre *</Label>
          <Input
            id="customerName"
            name="customerName"
            type="text"
            placeholder="Nombre del cliente"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefono *</Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            placeholder="+54 11 1234-5678"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            placeholder="email@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTime">Fecha y hora *</Label>
          <Input
            id="dateTime"
            name="dateTime"
            type="datetime-local"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partySize">Personas *</Label>
          <Input
            id="partySize"
            name="partySize"
            type="number"
            min="1"
            placeholder="2"
            required
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear Reserva"}
        </Button>
      </div>
    </form>
  )
}
