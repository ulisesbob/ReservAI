"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { ReservationForm } from "./reservation-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Search, Loader2, Download } from "lucide-react"

type Reservation = {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  source: string
}

type PaginationInfo = {
  page: number
  limit: number
  total: number
  totalPages: number
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

export function ReservationList({ defaultDate }: { defaultDate: string }) {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input (400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const fetchReservations = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "20")
    if (date) params.set("date", date)
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())

    try {
      const res = await fetch(`/api/reservations?${params}`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setReservations(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [date, statusFilter, debouncedSearch])

  useEffect(() => {
    fetchReservations(1)
  }, [fetchReservations])

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
      fetchReservations(pagination.page)
      router.refresh()
    } catch {
      alert("Error de conexion")
    } finally {
      setLoadingId(null)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            aria-label="Buscar reservas"
          />
        </div>

        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[160px] h-9"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9">
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              const params = new URLSearchParams()
              if (date) params.set("date", date)
              if (statusFilter !== "ALL") params.set("status", statusFilter)
              window.open(`/api/reservations/export?${params}`, "_blank")
            }}
            aria-label="Exportar reservas a CSV"
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Nueva Reserva</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nueva Reserva</DialogTitle>
              </DialogHeader>
              <ReservationForm
                onSuccess={() => {
                  setDialogOpen(false)
                  fetchReservations(1)
                  router.refresh()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {search ? "No se encontraron resultados." : "No hay reservas para mostrar."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Personas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{formatTime(r.dateTime)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(r.dateTime)}</TableCell>
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
                            variant="outline" size="sm"
                            disabled={loadingId === r.id}
                            onClick={() => updateStatus(r.id, "CONFIRMED")}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            Confirmar
                          </Button>
                        )}
                        {r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                          <Button
                            variant="outline" size="sm"
                            disabled={loadingId === r.id}
                            onClick={() => updateStatus(r.id, "CANCELLED")}
                            className="text-red-700 border-red-200 hover:bg-red-50"
                          >
                            Cancelar
                          </Button>
                        )}
                        {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          <Button
                            variant="outline" size="sm"
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {pagination.total} reserva{pagination.total !== 1 ? "s" : ""} — Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReservations(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchReservations(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
