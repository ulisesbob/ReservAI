"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Subscription {
  plan: "MONTHLY" | "YEARLY"
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"
  trialEndsAt: string
  currentPeriodEnd: string | null
  payments: Array<{
    id: string
    amount: string
    status: string
    paidAt: string | null
    createdAt: string
  }>
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Activa", variant: "default" },
  PAST_DUE: { label: "Pago pendiente", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
}

export function BillingForm({ subscription }: { subscription: Subscription | null }) {
  const [loading, setLoading] = useState<"MONTHLY" | "YEARLY" | null>(null)

  async function handleSubscribe(plan: "MONTHLY" | "YEARLY") {
    setLoading(plan)
    try {
      const res = await fetch("/api/settings/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.initPoint) {
        window.location.href = data.initPoint
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(null)
    }
  }

  const statusInfo = STATUS_LABELS[subscription?.status ?? "TRIALING"]
  const isActive = subscription?.status === "ACTIVE"
  const isTrialing = subscription?.status === "TRIALING"
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Estado de Suscripcion
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </CardTitle>
          <CardDescription>
            {isTrialing && trialDaysLeft > 0 && `Te quedan ${trialDaysLeft} dias de prueba gratuita.`}
            {isTrialing && trialDaysLeft === 0 && "Tu periodo de prueba ha terminado."}
            {isActive && `Plan ${subscription?.plan === "YEARLY" ? "Anual" : "Mensual"} activo.`}
            {subscription?.status === "PAST_DUE" && "Hay un problema con tu pago. Actualiza tu suscripcion."}
            {subscription?.status === "CANCELLED" && "Tu suscripcion fue cancelada. Suscribite de nuevo para continuar."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Plan Selection */}
      {!isActive && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Plan Mensual</CardTitle>
              <CardDescription>Facturacion mensual, cancela cuando quieras</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">$25.000 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("MONTHLY")}
                disabled={loading !== null}
              >
                {loading === "MONTHLY" ? "Procesando..." : "Suscribirme"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Plan Anual
                <Badge>Ahorra 20%</Badge>
              </CardTitle>
              <CardDescription>Facturacion anual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">$240.000 <span className="text-sm font-normal text-muted-foreground">/año</span></p>
              <Button
                className="w-full"
                onClick={() => handleSubscribe("YEARLY")}
                disabled={loading !== null}
              >
                {loading === "YEARLY" ? "Procesando..." : "Suscribirme"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment History */}
      {subscription?.payments && subscription.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscription.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">${Number(payment.amount).toLocaleString("es-AR")}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant={payment.status === "APPROVED" ? "default" : "destructive"}>
                    {payment.status === "APPROVED" ? "Aprobado" : payment.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
