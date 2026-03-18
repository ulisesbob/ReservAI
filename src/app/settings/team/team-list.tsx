"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface TeamListProps {
  initialUsers: TeamUser[]
  currentUserId: string
}

export function TeamList({ initialUsers, currentUserId }: TeamListProps) {
  const router = useRouter()
  const [users, setUsers] = useState<TeamUser[]>(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Invite form state
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [invitePassword, setInvitePassword] = useState("")

  function resetInviteForm() {
    setInviteName("")
    setInviteEmail("")
    setInvitePassword("")
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear usuario")
      }

      setUsers((prev) => [...prev, { ...data, createdAt: data.createdAt }])
      setInviteOpen(false)
      resetInviteForm()
      setMessage({ type: "success", text: "Empleado agregado correctamente." })
      router.refresh()
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al crear usuario",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/settings/team/${deleteId}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al eliminar usuario")
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteId))
      setDeleteId(null)
      setMessage({ type: "success", text: "Empleado eliminado correctamente." })
      router.refresh()
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al eliminar usuario",
      })
    } finally {
      setDeleting(false)
    }
  }

  const userToDelete = users.find((u) => u.id === deleteId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipo</CardTitle>
              <CardDescription>
                Gestiona los miembros de tu equipo. Los empleados pueden ver y
                gestionar reservas.
              </CardDescription>
            </div>
            <Dialog open={inviteOpen} onOpenChange={(open) => {
              setInviteOpen(open)
              if (!open) resetInviteForm()
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Invitar Empleado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Invitar empleado</DialogTitle>
                    <DialogDescription>
                      Crea una cuenta para un nuevo miembro del equipo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-name">Nombre</Label>
                      <Input
                        id="invite-name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Juan Perez"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="juan@ejemplo.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-password">
                        Contrasena temporal
                      </Label>
                      <Input
                        id="invite-password"
                        type="password"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="Minimo 8 caracteres"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Crear cuenta
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de alta</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role === "ADMIN" ? "Admin" : "Empleado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>
                    {user.role !== "ADMIN" && user.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-600"
              : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
            <DialogDescription>
              Estas seguro de que queres eliminar a{" "}
              <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? Esta
              accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
