"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ReservationForm } from "./reservation-form"

type SerializedReservation = {
  id: string
  restaurantId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  source: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
}

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  MANUAL: "Manual",
}

export function ReservationList({
  reservations,
}: {
  reservations: SerializedReservation[]
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [showForm, setShowForm] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered =
    statusFilter === "ALL"
      ? reservations
      : reservations.filter((r) => r.status === statusFilter)

  async function updateStatus(id: string, status: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Error al actualizar la reserva")
        return
      }
      router.refresh()
    } catch {
      alert("Error de conexion")
    } finally {
      setLoadingId(null)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Filtrar:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Todas</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="COMPLETED">Completadas</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "Cancelar" : "Nueva Reserva"}
        </button>
      </div>

      {/* New reservation form */}
      {showForm && (
        <div className="mb-6">
          <ReservationForm
            onSuccess={() => {
              setShowForm(false)
              router.refresh()
            }}
          />
        </div>
      )}

      {/* Reservation table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No hay reservas para mostrar.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Personas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Origen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {formatTime(r.dateTime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div>{r.customerName}</div>
                    <div className="text-xs text-gray-400">{r.customerPhone}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {r.partySize}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {SOURCE_LABELS[r.source] || r.source}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.status !== "CONFIRMED" && (
                        <button
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "CONFIRMED")}
                          className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          Confirmar
                        </button>
                      )}
                      {r.status !== "CANCELLED" && (
                        <button
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "CANCELLED")}
                          className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                      {r.status !== "COMPLETED" && (
                        <button
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "COMPLETED")}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                        >
                          Completar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
