"use client"

import { useState, useEffect, useCallback } from "react"
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

// List of reservations that can be marked as no-show or completed from the main dashboard
// This page also provides bulk management via status update calls

export default function NoShowsPage() {
  const [noShows, setNoShows] = useState<NoShowReservation[]>([])
  const [stats, setStats] = useState<Stats>({ totalNoShows: 0, noShowRate: 0, flaggedCustomers: 0 })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Also load recent reservations that can be marked
  const [recentReservations, setRecentReservations] = useState<Array<{
    id: string
    customerName: string
    customerPhone: string
    dateTime: string
    partySize: number
    status: string
  }>>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  const fetchNoShows = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/no-shows?page=${page}&limit=20`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setNoShows(json.data || [])
      setStats(json.stats || { totalNoShows: 0, noShowRate: 0, flaggedCustomers: 0 })
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      setNoShows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecentReservations = useCallback(async () => {
    setLoadingRecent(true)
    try {
      // Fetch past confirmed reservations (yesterday and earlier, still CONFIRMED/PENDING)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split("T")[0]
      const res = await fetch(`/api/reservations?status=CONFIRMED&date=${dateStr}&sortOrder=desc&limit=50`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      // Filter to past reservations
      const past = (json.data || []).filter((r: { dateTime: string }) => new Date(r.dateTime) < new Date())
      setRecentReservations(past.slice(0, 20))
    } catch {
      setRecentReservations([])
    } finally {
      setLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    fetchNoShows(1)
    fetchRecentReservations()
  }, [fetchNoShows, fetchRecentReservations])

  async function updateStatus(id: string, status: "NO_SHOW" | "COMPLETED") {
    setUpdating(id)
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("update failed")
      await Promise.all([fetchNoShows(pagination.page), fetchRecentReservations()])
    } catch {
      // silently fail — user can retry
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
        <p className="text-muted-foreground">
          Clientes que no se presentaron a sus reservas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total no-shows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNoShows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de no-show
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noShowRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">del total completado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
            <p className="text-xs text-muted-foreground mt-1">3+ no-shows</p>
          </CardContent>
        </Card>
      </div>

      {/* Mark recent reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservas pasadas sin confirmar asistencia</CardTitle>
          <p className="text-sm text-muted-foreground">
            Marcalas como completadas o no-show.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center px-4">
              No hay reservas pasadas pendientes de revision.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Personas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.customerName}</div>
                        <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : noShows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <UserX className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No hay no-shows registrados.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha reserva</TableHead>
                      <TableHead>Personas</TableHead>
                      <TableHead>No-shows totales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {noShows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{r.customerName}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.customerPhone}
                              </div>
                              {r.customerEmail && (
                                <div className="text-xs text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
                    Pagina {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchNoShows(pagination.page - 1)}
                      aria-label="Pagina anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchNoShows(pagination.page + 1)}
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
