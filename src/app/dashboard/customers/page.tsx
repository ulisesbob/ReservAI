"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react"

interface Customer {
  customerPhone: string
  customerName: string
  customerEmail: string | null
  totalReservations: number
  totalGuests: number
  lastVisit: string
  firstVisit: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())

    try {
      const res = await fetch(`/api/customers?${params}`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setCustomers(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchCustomers(1)
  }, [fetchCustomers])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Historial de clientes y sus reservas.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar clientes"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron clientes." : "Aún no hay clientes con reservas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm text-muted-foreground">
                {pagination.total} cliente{pagination.total !== 1 ? "s" : ""} en total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Reservas</TableHead>
                      <TableHead>Comensales</TableHead>
                      <TableHead>Primera visita</TableHead>
                      <TableHead>Última visita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.customerPhone}>
                        <TableCell>
                          <div className="font-medium">{c.customerName}</div>
                          <div className="text-xs text-muted-foreground">{c.customerPhone}</div>
                          {c.customerEmail && (
                            <div className="text-xs text-muted-foreground">{c.customerEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{c.totalReservations}</Badge>
                        </TableCell>
                        <TableCell>{c.totalGuests}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(c.firstVisit)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(c.lastVisit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
                  aria-label="Página siguiente"
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
