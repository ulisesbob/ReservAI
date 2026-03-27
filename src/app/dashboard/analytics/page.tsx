"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, Users, XCircle, Clock, MessageCircle, PenLine, DollarSign } from "lucide-react"
import Link from "next/link"

interface Stats {
  period: { days: number }
  total: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  avgPartySize: number
  cancellationRate: number
  peakHours: Array<{ hour: number; count: number }>
  dailyCounts: Array<{ day: string; count: number }>
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reservations/stats?days=${days}`)
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json() })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-muted-foreground text-center py-12">Error al cargar estadísticas.</p>
  }

  const maxDaily = Math.max(...stats.dailyCounts.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Estadísticas de reservas de tu restaurante.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics/revenue">
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-1" />
              Ver Revenue Analytics
            </Button>
          </Link>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]" aria-label="Periodo de tiempo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Promedio personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgPartySize}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Tasa cancelación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.cancellationRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Vía WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.bySource["WHATSAPP"] ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily chart (CSS bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reservas por día</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.dailyCounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay datos para este periodo.</p>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-8">
              {stats.dailyCounts.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1 min-w-[24px] flex-1 relative">
                  <span className="text-[10px] text-muted-foreground">{d.count}</span>
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${(d.count / maxDaily) * 120}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-1">
                    {d.day.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Peak hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" /> Horarios pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.peakHours.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay datos.</p>
            ) : (
              <div className="space-y-3">
                {stats.peakHours.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-12">{String(h.hour).padStart(2, "0")}:00</span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${(h.count / Math.max(stats.peakHours[0].count, 1)) * 100}%` }}
                      >
                        <span className="text-xs text-white font-medium">{h.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenLine className="h-4 w-4" /> Origen de reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {source === "WHATSAPP" ? (
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                    ) : (
                      <PenLine className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm">{source === "WHATSAPP" ? "WhatsApp" : "Manual"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
