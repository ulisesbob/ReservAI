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
  const [cancelLoading, setCancelLoading] = useState(false)
  const [changePlanLoading, setChangePlanLoading] = useState<"MONTHLY" | "YEARLY" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubscribe(plan: "MONTHLY" | "YEARLY") {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch("/api/settings/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al procesar el pago")
        return
      }
      if (data.initPoint) {
        window.location.href = data.initPoint
      } else {
        setError("No se recibio el enlace de pago. Intenta de nuevo.")
      }
    } catch {
      setError("Error de conexion. Verifica tu internet.")
    } finally {
      setLoading(null)
    }
  }

  async function handleChangePlan(newPlan: "MONTHLY" | "YEARLY") {
    setChangePlanLoading(newPlan)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/settings/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al cambiar de plan")
        return
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setSuccessMsg("Plan actualizado correctamente.")
        window.location.reload()
      }
    } catch {
      setError("Error de conexion. Verifica tu internet.")
    } finally {
      setChangePlanLoading(null)
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "¿Estas seguro de que queres cancelar tu suscripcion? Perderas acceso a las funciones premium al finalizar el periodo actual."
    )
    if (!confirmed) return

    setCancelLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/settings/billing/cancel", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al cancelar la suscripcion")
        return
      }
      setSuccessMsg("Suscripcion cancelada correctamente.")
      window.location.reload()
    } catch {
      setError("Error de conexion. Verifica tu internet.")
    } finally {
      setCancelLoading(false)
    }
  }

  const statusInfo = STATUS_LABELS[subscription?.status ?? "TRIALING"]
  const isActive = subscription?.status === "ACTIVE"
  const isTrialing = subscription?.status === "TRIALING"
  const isCancelled = subscription?.status === "CANCELLED"
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const currentPlan = subscription?.plan
  const alternatePlan: "MONTHLY" | "YEARLY" = currentPlan === "YEARLY" ? "MONTHLY" : "YEARLY"

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
            {isActive && `Plan ${currentPlan === "YEARLY" ? "Anual" : "Mensual"} activo.`}
            {subscription?.status === "PAST_DUE" && "Hay un problema con tu pago. Actualiza tu suscripcion."}
            {isCancelled && "Tu suscripcion fue cancelada. Suscribite de nuevo para continuar."}
          </CardDescription>
        </CardHeader>
        {(isActive || isTrialing) && subscription?.currentPeriodEnd && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Proximo cobro: {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-AR")}
            </p>
          </CardContent>
        )}
        {isTrialing && subscription?.trialEndsAt && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fin del trial: {new Date(subscription.trialEndsAt).toLocaleDateString("es-AR")}
            </p>
          </CardContent>
        )}
      </Card>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-4 py-2">
          {error}
        </p>
      )}

      {successMsg && (
        <p className="text-sm text-green-700 rounded-md border border-green-200 bg-green-50 px-4 py-2">
          {successMsg}
        </p>
      )}

      {/* Plan Selection — show when no subscription or cancelled */}
      {(!subscription || isCancelled || subscription?.status === "PAST_DUE") && (
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
              <p className="text-3xl font-bold mb-4">$240.000 <span className="text-sm font-normal text-muted-foreground">/ano</span></p>
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

      {/* Change Plan — show when active or trialing */}
      {(isActive || isTrialing) && (
        <Card>
          <CardHeader>
            <CardTitle>Cambiar de Plan</CardTitle>
            <CardDescription>
              Actualmente en el plan {currentPlan === "YEARLY" ? "Anual" : "Mensual"}.
              {alternatePlan === "YEARLY"
                ? " Cambia al plan Anual y ahorra un 20%."
                : " Cambia al plan Mensual para mayor flexibilidad."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                {alternatePlan === "YEARLY"
                  ? "Plan Anual: $240.000/ano (ahorra $60.000)"
                  : "Plan Mensual: $25.000/mes"}
              </p>
              <Button
                variant="outline"
                onClick={() => handleChangePlan(alternatePlan)}
                disabled={changePlanLoading !== null || cancelLoading}
              >
                {changePlanLoading === alternatePlan
                  ? "Procesando..."
                  : `Cambiar a Plan ${alternatePlan === "YEARLY" ? "Anual" : "Mensual"}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription — show when active or trialing */}
      {(isActive || isTrialing) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Cancelar Suscripcion</CardTitle>
            <CardDescription>
              Al cancelar, perderas acceso a las funciones premium al finalizar tu periodo actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelLoading || changePlanLoading !== null}
            >
              {cancelLoading ? "Cancelando..." : "Cancelar Suscripcion"}
            </Button>
          </CardContent>
        </Card>
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
