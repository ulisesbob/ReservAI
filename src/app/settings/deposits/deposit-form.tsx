"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

interface DepositFormProps {
  initialData: {
    depositEnabled: boolean
    depositAmount: number
    depositMinPartySize: number
  }
}

export function DepositForm({ initialData }: DepositFormProps) {
  const [enabled, setEnabled] = useState(initialData.depositEnabled)
  const [amount, setAmount] = useState(initialData.depositAmount)
  const [minPartySize, setMinPartySize] = useState(initialData.depositMinPartySize)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositEnabled: enabled,
          depositAmount: amount,
          depositMinPartySize: minPartySize,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al guardar")
      }

      setMessage({ type: "success", text: "Configuración de señas guardada correctamente." })
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
          <CardTitle>Señas / Depósitos</CardTitle>
          <CardDescription>
            Configura si queres pedir una sena para reservas de grupos grandes.
            La sena se cobra via MercadoPago al momento de reservar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch
              id="deposit-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="deposit-enabled" className="font-medium">
              Habilitar señas
            </Label>
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Monto de la seña (ARS)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Monto fijo en pesos argentinos que se cobra como seña.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-party-size">
                  Mínimo de personas para pedir seña
                </Label>
                <Input
                  id="min-party-size"
                  type="number"
                  min={1}
                  value={minPartySize}
                  onChange={(e) => setMinPartySize(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Solo se pide sena a reservas con esta cantidad de personas o mas.
                </p>
              </div>
            </>
          )}
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
