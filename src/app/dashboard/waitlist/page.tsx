"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"

interface WaitlistEntry {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: string
  partySize: number
  status: string
  notifiedAt: string | null
  expiresAt: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  WAITING: { label: "Esperando", variant: "default" },
  NOTIFIED: { label: "Notificado", variant: "secondary" },
  CONFIRMED: { label: "Confirmado", variant: "outline" },
  EXPIRED: { label: "Expirado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("")

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateFilter) params.set("date", dateFilter)
      const res = await fetch(`/api/waitlist?${params}`)
      if (res.ok) setEntries(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dateFilter])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 10000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  async function handleRemove(id: string) {
    await fetch(`/api/waitlist/${id}`, { method: "DELETE" })
    fetchEntries()
  }

  const activeEntries = entries.filter((e) => e.status === "WAITING" || e.status === "NOTIFIED")

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de espera</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeEntries.length} {activeEntries.length === 1 ? "persona esperando" : "personas esperando"}
          </p>
        </div>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Entradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay entradas en la lista de espera</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Teléfono</th>
                    <th className="pb-3 font-medium">Fecha/Hora</th>
                    <th className="pb-3 font-medium">Personas</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const dt = new Date(entry.dateTime)
                    const statusInfo = STATUS_LABELS[entry.status] || { label: entry.status, variant: "default" as const }
                    return (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{entry.customerName}</td>
                        <td className="py-3">{entry.customerPhone}</td>
                        <td className="py-3">{dt.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} {dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="py-3">{entry.partySize}</td>
                        <td className="py-3"><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></td>
                        <td className="py-3">
                          {(entry.status === "WAITING" || entry.status === "NOTIFIED") && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemove(entry.id)}><Trash2 className="w-4 h-4" /></Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
