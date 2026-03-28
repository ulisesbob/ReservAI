"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Pencil, Trash2, LayoutGrid } from "lucide-react"

interface RestaurantTable {
  id: string
  name: string
  capacity: number
  zone: string | null
  isActive: boolean
  createdAt: string
}

interface TableForm {
  name: string
  capacity: string
  zone: string
}

const ZONE_OPTIONS = ["Interior", "Exterior", "Terraza", "Bar", "VIP", "Otra"]
const EMPTY_FORM: TableForm = { name: "", capacity: "2", zone: "" }

export function TablesManager() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null)
  const [form, setForm] = useState<TableForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/tables")
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setTables(json.data || [])
    } catch {
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTables() }, [fetchTables])

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError("")
    setAddOpen(true)
  }

  function openEdit(table: RestaurantTable) {
    setForm({ name: table.name, capacity: String(table.capacity), zone: table.zone ?? "" })
    setFormError("")
    setEditTable(table)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")

    const capacity = parseInt(form.capacity, 10)
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio")
      setSubmitting(false)
      return
    }
    if (isNaN(capacity) || capacity < 1 || capacity > 100) {
      setFormError("Capacidad inválida (1–100)")
      setSubmitting(false)
      return
    }

    try {
      const isEdit = editTable !== null
      const url = isEdit ? `/api/tables?id=${editTable.id}` : "/api/tables"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          capacity,
          zone: form.zone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "Error al guardar")
        return
      }
      setAddOpen(false)
      setEditTable(null)
      await fetchTables()
    } catch {
      setFormError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar esta mesa? Se desactivará y no aparecerá en las reservas.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: "DELETE" })
      if (!res.ok) return
      await fetchTables()
    } finally {
      setDeletingId(null)
    }
  }

  const activeTables = tables.filter((t) => t.isActive)
  const inactiveTables = tables.filter((t) => !t.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mesas</h2>
          <p className="text-muted-foreground text-sm">
            Configurá las mesas de tu restaurante, su capacidad y zona.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar mesa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva mesa</DialogTitle>
            </DialogHeader>
            <TableFormBody
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={formError}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editTable !== null} onOpenChange={(open) => { if (!open) setEditTable(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mesa</DialogTitle>
          </DialogHeader>
          <TableFormBody
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={formError}
            onCancel={() => setEditTable(null)}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTables.length === 0 && inactiveTables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <LayoutGrid className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No hay mesas configuradas. Agregá la primera mesa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">{table.name}</TableCell>
                      <TableCell>{table.capacity} personas</TableCell>
                      <TableCell>{table.zone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {table.isActive ? (
                          <Badge variant="secondary">Activa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar mesa"
                            onClick={() => openEdit(table)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar mesa"
                            disabled={deletingId === table.id}
                            onClick={() => handleDelete(table.id)}
                          >
                            {deletingId === table.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TableFormBody({
  form,
  setForm,
  onSubmit,
  submitting,
  error,
  onCancel,
}: {
  form: TableForm
  setForm: React.Dispatch<React.SetStateAction<TableForm>>
  onSubmit: (e: React.FormEvent) => Promise<void>
  submitting: boolean
  error: string
  onCancel: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="table-name">Nombre *</Label>
        <Input
          id="table-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Mesa 1, Mesa VIP..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="table-capacity">Capacidad (personas) *</Label>
        <Input
          id="table-capacity"
          type="number"
          min={1}
          max={100}
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="table-zone">Zona</Label>
        <Select value={form.zone} onValueChange={(v) => setForm((f) => ({ ...f, zone: v === "__none__" ? "" : v }))}>
          <SelectTrigger id="table-zone">
            <SelectValue placeholder="Sin zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin zona</SelectItem>
            {ZONE_OPTIONS.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar
        </Button>
      </div>
    </form>
  )
}
