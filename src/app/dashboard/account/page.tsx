"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileMsg, setProfileMsg] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((data) => {
        setUser(data)
        setName(data.name)
      })
      .catch(() => {})
  }, [])

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg("")
    setProfileLoading(true)

    const res = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setProfileLoading(false)

    if (res.ok) {
      setUser(data)
      setProfileMsg("Perfil actualizado")
    } else {
      setProfileMsg(data.error || "Error al guardar")
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg("")

    if (newPassword !== confirmPassword) {
      setPasswordMsg("Las contraseñas no coinciden")
      return
    }

    setPasswordLoading(true)
    const res = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json()
    setPasswordLoading(false)

    if (res.ok) {
      setPasswordMsg("Contraseña actualizada")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordMsg(data.error || "Error al cambiar contraseña")
    }
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Cuenta</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Cuenta</h1>
        <p className="text-muted-foreground">Gestiona tu perfil y seguridad.</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="max-w-md bg-muted" />
              <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={user.role === "ADMIN" ? "Administrador" : "Empleado"} disabled className="max-w-md bg-muted" />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes("Error") ? "text-destructive" : "text-emerald-600"}`}>
                {profileMsg}
              </p>
            )}
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="max-w-md"
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.includes("Error") || passwordMsg.includes("coinciden") || passwordMsg.includes("incorrecta") ? "text-destructive" : "text-emerald-600"}`}>
                {passwordMsg}
              </p>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
