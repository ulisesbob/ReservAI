"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2, Download, BarChart2 } from "lucide-react"

type ReportType = "reservations" | "revenue" | "guests" | "noShows"

interface Column { key: string; label: string }

const TABS: Array<{ value: ReportType; label: string; columns: Column[] }> = [
  {
    value: "reservations",
    label: "Reservas",
    columns: [
      { key: "customerName", label: "Cliente" },
      { key: "customerPhone", label: "Teléfono" },
      { key: "dateTime", label: "Fecha y Hora" },
      { key: "partySize", label: "Personas" },
      { key: "status", label: "Estado" },
      { key: "source", label: "Origen" },
    ],
  },
  {
    value: "revenue",
    label: "Ingresos",
    columns: [
      { key: "amount", label: "Monto" },
      { key: "currency", label: "Moneda" },
      { key: "status", label: "Estado" },
      { key: "paidAt", label: "Pagado en" },
    ],
  },
  {
    value: "guests",
    label: "Clientes",
    columns: [
      { key: "nombre", label: "Nombre" },
      { key: "telefono", label: "Teléfono" },
      { key: "email", label: "Email" },
      { key: "visitas", label: "Visitas en periodo" },
      { key: "ultima_visita", label: "Última visita" },
    ],
  },
  {
    value: "noShows",
    label: "No-shows",
    columns: [
      { key: "customerName", label: "Cliente" },
      { key: "customerPhone", label: "Teléfono" },
      { key: "dateTime", label: "Fecha y Hora" },
      { key: "partySize", label: "Personas" },
    ],
  },
]

function defaultDates() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

function formatCell(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") {
    // Try to detect ISO dates
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }
  return String(value)
}

export default function ReportsPage() {
  const defaults = defaultDates()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [activeTab, setActiveTab] = useState<ReportType>("reservations")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type: activeTab, format: "json", from, to })
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || "Error al cargar el reporte")
        setData([])
        return
      }
      const json = await res.json()
      setData(json.data || [])
    } catch {
      setError("Error de conexión")
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDownloadCsv() {
    setCsvLoading(true)
    try {
      const params = new URLSearchParams({ type: activeTab, format: "csv", from, to })
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte_${activeTab}_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setCsvLoading(false)
    }
  }

  const tabConfig = TABS.find((t) => t.value === activeTab)!

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Exportá y visualizá datos de tu restaurante.</p>
        </div>
      </div>

      {/* Date range filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-from" className="text-sm font-medium">
                Desde
              </label>
              <Input
                id="report-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-to" className="text-sm font-medium">
                Hasta
              </label>
              <Input
                id="report-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={csvLoading || loading}
          >
            {csvLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar CSV
          </Button>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {error ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-destructive text-sm">{error}</p>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : data.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12">
                  <BarChart2 className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No hay datos para el período seleccionado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm text-muted-foreground">
                    {data.length} registro{data.length !== 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {t.columns.map((col) => (
                            <TableHead key={col.key}>{col.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row, i) => (
                          <TableRow key={i}>
                            {t.columns.map((col) => (
                              <TableCell key={col.key} className="text-sm">
                                {formatCell(row[col.key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
