"use client"

import { useState } from "react"

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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva Reserva</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefono *
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha y hora *
          </label>
          <input
            id="dateTime"
            name="dateTime"
            type="datetime-local"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="partySize" className="block text-sm font-medium text-gray-700 mb-1">
            Personas *
          </label>
          <input
            id="partySize"
            name="partySize"
            type="number"
            min="1"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creando..." : "Crear Reserva"}
        </button>
      </div>
    </form>
  )
}
