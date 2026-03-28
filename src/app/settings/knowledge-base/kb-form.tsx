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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface KBFormProps {
  initialKnowledgeBase: string
}

export function KBForm({ initialKnowledgeBase }: KBFormProps) {
  const [knowledgeBase, setKnowledgeBase] = useState(initialKnowledgeBase)
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
      const res = await fetch("/api/settings/knowledge-base", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeBase }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({
        type: "success",
        text: "Knowledge Base guardada correctamente.",
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
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            Escribe informacion sobre tu restaurante que el agente de IA usara
            para responder a los clientes. Incluye: menu, especialidades,
            politicas, ubicacion, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="knowledgeBase">Contenido</Label>
            <Textarea
              id="knowledgeBase"
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Ej: Somos un restaurante de cocina italiana ubicado en Palermo. Nuestro menu incluye pastas, pizzas y ensaladas. Aceptamos reservas de 2 a 10 personas..."
              className="min-h-[300px] resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">
              {knowledgeBase.length.toLocaleString()} caracteres
            </p>
          </div>
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
