"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search, Loader2, ChevronLeft, ChevronRight, UserPlus, Users, Star,
} from "lucide-react"

interface Guest {
  id: string
  name: string
  phone: string
  email: string | null
  vipStatus: boolean
  totalVisits: number
  totalNoShows: number
  lastVisit: string | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface NewGuestForm {
  name: string
  phone: string
  email: string
  notes: string
  allergies: string
}

export default function GuestsPage() {
  const router = useRouter()
  const [guests, setGuests] = useState<Guest[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState("")
  const [form, setForm] = useState<NewGuestForm>({ name: "", phone: "", email: "", notes: "", allergies: "" })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const fetchGuests = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())

    try {
      const res = await fetch(`/api/guests?${params}`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setGuests(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      setGuests([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => { fetchGuests(1) }, [fetchGuests])

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setAddError("")
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          notes: form.notes || null,
          allergies: form.allergies || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || "Error al crear cliente")
        return
      }
      setAddOpen(false)
      setForm({ name: "", phone: "", email: "", notes: "", allergies: "" })
      await fetchGuests(1)
    } catch {
      setAddError("Error de conexion")
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes CRM</h1>
          <p className="text-muted-foreground">Gestion de clientes, historial y notas.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Nombre *</Label>
                <Input
                  id="guest-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Juan Perez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Telefono *</Label>
                <Input
                  id="guest-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+54911..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="juan@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-allergies">Alergias</Label>
                <Input
                  id="guest-allergies"
                  value={form.allergies}
                  onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                  placeholder="mariscos, nueces..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-notes">Notas</Label>
                <Input
                  id="guest-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Prefiere mesa junto a la ventana..."
                />
              </div>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o telefono..."
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
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              {search
                ? "No se encontraron clientes con esa búsqueda."
                : "No hay clientes registrados. Los clientes se agregan automáticamente cuando hacen una reserva."}
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
                      <TableHead>Visitas</TableHead>
                      <TableHead>No-shows</TableHead>
                      <TableHead>VIP</TableHead>
                      <TableHead>Ultima visita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map((g) => (
                      <TableRow
                        key={g.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/guests/${g.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{g.name}</div>
                          <div className="text-xs text-muted-foreground">{g.phone}</div>
                          {g.email && (
                            <div className="text-xs text-muted-foreground">{g.email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{g.totalVisits}</Badge>
                        </TableCell>
                        <TableCell>
                          {g.totalNoShows > 0 ? (
                            <Badge variant="destructive">{g.totalNoShows}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {g.vipStatus ? (
                            <span className="flex items-center gap-1 text-yellow-600 font-medium text-sm">
                              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                              VIP
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(g.lastVisit)}
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
                Pagina {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchGuests(pagination.page - 1)}
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchGuests(pagination.page + 1)}
                  aria-label="Pagina siguiente"
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
