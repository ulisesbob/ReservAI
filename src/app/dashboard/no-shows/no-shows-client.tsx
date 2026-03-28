"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  X,
} from "lucide-react"

interface NoShowReservation {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  noShowCount: number
  isFlagged: boolean
}

interface Stats {
  totalNoShows: number
  noShowRate: number
  flaggedCustomers: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface RecentReservation {
  id: string
  customerName: string
  customerPhone: string
  dateTime: string
  partySize: number
  status: string
}

interface NoShowsClientProps {
  initialNoShows: NoShowReservation[]
  initialStats: Stats
  initialPagination: Pagination
  initialRecentReservations: RecentReservation[]
}

export function NoShowsClient({
  initialNoShows,
  initialStats,
  initialPagination,
  initialRecentReservations,
}: NoShowsClientProps) {
  const [noShows, setNoShows] = useState<NoShowReservation[]>(initialNoShows)
  const [stats, setStats] = useState<Stats>(initialStats)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>(initialRecentReservations)
  const [loadingRecent, setLoadingRecent] = useState(false)

  const fetchNoShows = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reservations/no-shows?page=${page}&limit=20`)
      if (!res.ok) throw new Error("No se pudieron cargar los no-shows")
      const json = await res.json()
      setNoShows(json.data || [])
      setStats(json.stats || { totalNoShows: 0, noShowRate: 0, flaggedCustomers: 0 })
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecentReservations = useCallback(async () => {
    setLoadingRecent(true)
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split("T")[0]
      const res = await fetch(`/api/reservations?status=CONFIRMED&date=${dateStr}&sortOrder=desc&limit=50`)
      if (!res.ok) throw new Error("No se pudieron cargar las reservas recientes")
      const json = await res.json()
      const past = (json.data || []).filter((r: { dateTime: string }) => new Date(r.dateTime) < new Date())
      setRecentReservations(past.slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar reservas recientes")
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  async function updateStatus(id: string, status: "NO_SHOW" | "COMPLETED") {
    setUpdating(id)
    setError(null)
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar el estado")
      await Promise.all([fetchNoShows(pagination.page), fetchRecentReservations()])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar")
    } finally {
      setUpdating(null)
    }
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">No-shows</h1>
        <p className="text-foreground/75">
          Clientes que no se presentaron a sus reservas.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 rounded p-1 hover:bg-red-100"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Total no-shows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNoShows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Tasa de no-show
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noShowRate}%</div>
            <p className="text-xs text-foreground/70 mt-1">del total completado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/75">
              Clientes reincidentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.flaggedCustomers}</div>
              {stats.flaggedCustomers > 0 && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-foreground/70 mt-1">3+ no-shows</p>
          </CardContent>
        </Card>
      </div>

      {/* Mark recent reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservas pasadas sin confirmar asistencia</CardTitle>
          <p className="text-sm text-foreground/75">
            Marcalas como completadas o no-show.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecent ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />
              <span className="sr-only">Cargando reservas recientes</span>
            </div>
          ) : recentReservations.length === 0 ? (
            <p className="text-sm text-foreground/70 py-8 text-center px-4">
              No hay reservas pasadas pendientes de revision.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Cliente</TableHead>
                    <TableHead scope="col">Fecha</TableHead>
                    <TableHead scope="col">Personas</TableHead>
                    <TableHead scope="col">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.customerName}</div>
                        <div className="text-xs text-foreground/70">{r.customerPhone}</div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(r.dateTime)}</TableCell>
                      <TableCell>{r.partySize}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "COMPLETED")}
                          >
                            {updating === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Asistio
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "NO_SHOW")}
                          >
                            {updating === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserX className="h-3 w-3 mr-1" />
                            )}
                            No-show
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No-show history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de no-shows</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />
              <span className="sr-only">Cargando historial de no-shows</span>
            </div>
          ) : noShows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <UserX className="h-10 w-10 text-foreground/70" />
              <p className="text-foreground/70">No hay no-shows registrados.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Cliente</TableHead>
                      <TableHead scope="col">Fecha reserva</TableHead>
                      <TableHead scope="col">Personas</TableHead>
                      <TableHead scope="col">No-shows totales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noShows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{r.customerName}</div>
                              <div className="text-xs text-foreground/75">
                                {r.customerPhone}
                              </div>
                              {r.customerEmail && (
                                <div className="text-xs text-foreground/75">
                                  {r.customerEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(r.dateTime)}
                        </TableCell>
                        <TableCell>{r.partySize}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={r.isFlagged ? "destructive" : "secondary"}
                            >
                              {r.noShowCount}
                            </Badge>
                            {r.isFlagged && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                Reincidente
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-foreground/75">
                    Pagina {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchNoShows(pagination.page - 1)}
                      aria-label="Página anterior"
                      aria-label="Pagina anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchNoShows(pagination.page + 1)}
                      aria-label="Página siguiente"
                      aria-label="Pagina siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
