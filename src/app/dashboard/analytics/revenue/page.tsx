"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react"

interface RevenueData {
  mrr: number; totalRevenue: number; churnRate: number; ltv: number
  activeCount: number; totalCount: number
  revenueByMonth: { month: string; revenue: number; count: number }[]
  statusBreakdown: { active: number; trialing: number; pastDue: number; cancelled: number }
  planBreakdown: { monthly: number; yearly: number }
}

export default function RevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [period, setPeriod] = useState("90")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/revenue?period=${period}`)
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  if (loading || !data) return <div className="mx-auto max-w-6xl px-4 py-8"><p className="text-muted-foreground">Cargando...</p></div>

  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">Métricas de monetización y suscripciones</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
            <SelectItem value="180">6 meses</SelectItem>
            <SelectItem value="365">1 año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="w-4 h-4" />MRR</div>
          <p className="text-2xl font-bold">${data.mrr.toLocaleString()} ARS</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="w-4 h-4" />Revenue Total</div>
          <p className="text-2xl font-bold">${data.totalRevenue.toLocaleString()} ARS</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingDown className="w-4 h-4" />Churn Rate</div>
          <p className="text-2xl font-bold">{data.churnRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Users className="w-4 h-4" />LTV</div>
          <p className="text-2xl font-bold">${data.ltv.toLocaleString()} ARS</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue por mes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.revenueByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-20">{m.month}</span>
                <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                  <div className="h-full bg-primary rounded-md transition-all" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                </div>
                <span className="text-sm font-medium w-28 text-right">${m.revenue.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground w-16">{m.count} pagos</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Estado de suscripciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm">Activas</span><Badge variant="default">{data.statusBreakdown.active}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-sm">En prueba</span><Badge variant="secondary">{data.statusBreakdown.trialing}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-sm">Pago pendiente</span><Badge variant="destructive">{data.statusBreakdown.pastDue}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-sm">Canceladas</span><Badge variant="outline">{data.statusBreakdown.cancelled}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Distribución de planes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm">Mensual ($250/mes)</span><Badge>{data.planBreakdown.monthly}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-sm">Anual ($2.400/año)</span><Badge>{data.planBreakdown.yearly}</Badge></div>
            <div className="pt-2 border-t text-sm text-muted-foreground">Total activas: {data.activeCount} de {data.totalCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
