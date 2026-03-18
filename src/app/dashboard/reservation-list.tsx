"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ReservationForm } from "./reservation-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "border-yellow-500 text-yellow-700 bg-yellow-50",
  CONFIRMED: "border-transparent bg-green-100 text-green-800",
  CANCELLED: "border-transparent bg-red-100 text-red-800",
  COMPLETED: "border-transparent bg-gray-100 text-gray-700",
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

const SOURCE_CLASSES: Record<string, string> = {
  WHATSAPP: "border-transparent bg-blue-100 text-blue-800",
  MANUAL: "border-transparent bg-gray-100 text-gray-700",
}

export function ReservationList({
  reservations,
}: {
  reservations: SerializedReservation[]
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
              <SelectItem value="CANCELLED">Canceladas</SelectItem>
              <SelectItem value="COMPLETED">Completadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nueva Reserva</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nueva Reserva</DialogTitle>
            </DialogHeader>
            <ReservationForm
              onSuccess={() => {
                setDialogOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No hay reservas para mostrar.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Personas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {formatTime(r.dateTime)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customerName}</div>
                    <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                  </TableCell>
                  <TableCell>{r.partySize}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CLASSES[r.status] || ""}>
                      {STATUS_LABELS[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SOURCE_CLASSES[r.source] || ""}>
                      {SOURCE_LABELS[r.source] || r.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.status !== "CONFIRMED" && r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "CONFIRMED")}
                          className="text-green-700 border-green-200 hover:bg-green-50"
                        >
                          Confirmar
                        </Button>
                      )}
                      {r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "CANCELLED")}
                          className="text-red-700 border-red-200 hover:bg-red-50"
                        >
                          Cancelar
                        </Button>
                      )}
                      {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingId === r.id}
                          onClick={() => updateStatus(r.id, "COMPLETED")}
                          className="text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                          Completar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
