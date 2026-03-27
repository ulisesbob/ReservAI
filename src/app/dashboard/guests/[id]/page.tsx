"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft, Loader2, Star, Phone, Mail, Calendar, Clock,
  Users, Edit2, Check, X, Trash2,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Reservation {
  id: string
  customerName: string
  dateTime: string
  partySize: number
  status: string
  source: string
  createdAt: string
}

interface GuestDetail {
  id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  allergies: string | null
  preferences: string | null
  birthday: string | null
  vipStatus: boolean
  totalVisits: number
  totalNoShows: number
  totalSpent: string
  lastVisit: string | null
  createdAt: string
  reservations: Reservation[]
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CONFIRMED: { label: "Confirmada", variant: "default" },
  PENDING: { label: "Pendiente", variant: "secondary" },
  PENDING_DEPOSIT: { label: "Sena pendiente", variant: "secondary" },
  COMPLETED: { label: "Completada", variant: "outline" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
  NO_SHOW: { label: "No se presento", variant: "destructive" },
}

export default function GuestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [guest, setGuest] = useState<GuestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    notes: "",
    allergies: "",
    preferences: "",
    birthday: "",
    vipStatus: false,
  })

  const fetchGuest = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/guests/${id}`)
      if (!res.ok) { router.push("/dashboard/guests"); return }
      const data: GuestDetail = await res.json()
      setGuest(data)
      setEditForm({
        name: data.name,
        email: data.email || "",
        notes: data.notes || "",
        allergies: data.allergies || "",
        preferences: data.preferences || "",
        birthday: data.birthday ? data.birthday.slice(0, 10) : "",
        vipStatus: data.vipStatus,
      })
    } catch {
      router.push("/dashboard/guests")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { fetchGuest() }, [fetchGuest])

  async function handleSave() {
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email || null,
          notes: editForm.notes || null,
          allergies: editForm.allergies || null,
          preferences: editForm.preferences || null,
          birthday: editForm.birthday || null,
          vipStatus: editForm.vipStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || "Error al guardar"); return }
      setGuest((prev) => prev ? { ...prev, ...data } : null)
      setEditing(false)
    } catch {
      setSaveError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  async function handleVipToggle(value: boolean) {
    try {
      await fetch(`/api/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vipStatus: value }),
      })
      setGuest((prev) => prev ? { ...prev, vipStatus: value } : null)
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/guests/${id}`, { method: "DELETE" })
      router.push("/dashboard/guests")
    } catch { /* ignore */ }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString("es-AR", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    }) + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!guest) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/guests")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a clientes
        </Button>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminara el perfil de {guest.name}. Esta accion no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setSaveError("") }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest info card */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {guest.vipStatus && <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />}
                    {guest.name}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {guest.phone}
                    </span>
                    {guest.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {guest.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="vip-toggle" className="text-sm font-medium">VIP</Label>
                  <Switch
                    id="vip-toggle"
                    checked={editing ? editForm.vipStatus : guest.vipStatus}
                    onCheckedChange={editing
                      ? (v) => setEditForm((f) => ({ ...f, vipStatus: v }))
                      : handleVipToggle
                    }
                  />
                </div>
              </div>
            </CardHeader>

            {editing ? (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alergias</Label>
                    <Input
                      value={editForm.allergies}
                      onChange={(e) => setEditForm((f) => ({ ...f, allergies: e.target.value }))}
                      placeholder="mariscos, nueces..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cumpleanos</Label>
                    <Input
                      type="date"
                      value={editForm.birthday}
                      onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferencias</Label>
                  <Textarea
                    value={editForm.preferences}
                    onChange={(e) => setEditForm((f) => ({ ...f, preferences: e.target.value }))}
                    placeholder="Mesa junto a la ventana, sin sal, etc."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Notas del personal..."
                    rows={3}
                  />
                </div>
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              </CardContent>
            ) : (
              <CardContent className="space-y-3">
                {guest.allergies && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alergias</p>
                    <p className="text-sm mt-0.5">{guest.allergies}</p>
                  </div>
                )}
                {guest.preferences && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferencias</p>
                    <p className="text-sm mt-0.5">{guest.preferences}</p>
                  </div>
                )}
                {guest.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas internas</p>
                    <p className="text-sm mt-0.5">{guest.notes}</p>
                  </div>
                )}
                {guest.birthday && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Cumpleanos: {formatDate(guest.birthday)}
                  </div>
                )}
                {!guest.allergies && !guest.preferences && !guest.notes && !guest.birthday && (
                  <p className="text-sm text-muted-foreground italic">Sin informacion adicional.</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Reservation history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de reservas ({guest.reservations.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {guest.reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">Sin reservas registradas.</p>
              ) : (
                <div className="divide-y">
                  {guest.reservations.map((r) => {
                    const statusInfo = STATUS_LABELS[r.status] || { label: r.status, variant: "secondary" as const }
                    return (
                      <div key={r.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium">{formatDateTime(r.dateTime)}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {r.partySize} {r.partySize === 1 ? "persona" : "personas"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {r.source === "WHATSAPP" ? "WhatsApp" : "Manual"}
                            </span>
                          </div>
                        </div>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estadisticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{guest.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Visitas completadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{guest.totalNoShows}</p>
                <p className="text-xs text-muted-foreground">No-shows</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ultima visita</p>
                <p className="text-sm font-medium">{formatDate(guest.lastVisit)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente desde</p>
                <p className="text-sm font-medium">{formatDate(guest.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
