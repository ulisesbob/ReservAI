"use client"

import { useState } from "react"
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
import { Loader2, Eye, EyeOff } from "lucide-react"

interface WhatsAppFormProps {
  initialData: {
    whatsappPhoneId: string
    whatsappToken: string
  }
  maskedToken?: string
  hasExistingToken?: boolean
}

export function WhatsAppForm({ initialData, maskedToken, hasExistingToken }: WhatsAppFormProps) {
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(
    initialData.whatsappPhoneId
  )
  const [whatsappToken, setWhatsappToken] = useState(
    initialData.whatsappToken
  )
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhoneId, whatsappToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({
        type: "success",
        text: "Configuración de WhatsApp guardada correctamente.",
      })
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business API</CardTitle>
          <CardDescription>
            Configura las credenciales de tu cuenta de WhatsApp Business para
            recibir y enviar mensajes a tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="whatsappPhoneId">Phone Number ID</Label>
            <Input
              id="whatsappPhoneId"
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              placeholder="Ej: 123456789012345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappToken">Access Token</Label>
            <div className="relative">
              <Input
                id="whatsappToken"
                type={showToken ? "text" : "password"}
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                placeholder={hasExistingToken ? maskedToken || "Token guardado" : "EAAxxxxxxx..."}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Estos datos se encriptaran antes de guardarse.
          </p>
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

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  )
}
