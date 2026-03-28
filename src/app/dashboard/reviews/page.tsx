"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Star, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"

interface Review {
  id: string
  customerName: string
  customerPhone: string
  rating: number
  comment: string | null
  source: string
  createdAt: string
}

interface Stats {
  total: number
  avgRating: number | null
  distribution: Record<number, number>
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starClass = size === "md" ? "h-5 w-5" : "h-4 w-4"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${starClass} ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-foreground/70/30"}`}
        />
      ))}
    </div>
  )
}

function DistributionBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm w-3 text-right shrink-0 font-medium">{label}</span>
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
      <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="text-xs text-foreground/70 w-12 shrink-0 text-right tabular-nums">
        {count} ({pct}%)
      </span>
    </div>
  )
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState("ALL")

  const fetchReviews = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (ratingFilter !== "ALL") params.set("rating", ratingFilter)

    try {
      const res = await fetch(`/api/reviews?${params}`)
      if (!res.ok) throw new Error("fetch failed")
      const json = await res.json()
      setReviews(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      setStats(json.stats || null)
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [ratingFilter])

  useEffect(() => { fetchReviews(1) }, [fetchReviews])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  const sourceLabel: Record<string, string> = {
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
    MANUAL: "Manual",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reseñas</h1>
          <p className="text-foreground/70">Valoraciones de clientes post-visita.</p>
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por calificación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las notas</SelectItem>
            <SelectItem value="5">5 estrellas</SelectItem>
            <SelectItem value="4">4 estrellas</SelectItem>
            <SelectItem value="3">3 estrellas</SelectItem>
            <SelectItem value="2">2 estrellas</SelectItem>
            <SelectItem value="1">1 estrella</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* HERO: Average rating -- large and centered */}
          <Card className="flex flex-col items-center justify-center py-6">
            <CardContent className="flex flex-col items-center gap-1.5 p-0">
              {stats.avgRating !== null ? (
                <>
                  <span className="text-6xl font-extrabold tracking-tight leading-none">
                    {stats.avgRating}
                  </span>
                  <StarRating rating={Math.round(stats.avgRating)} size="md" />
                  <p className="text-xs text-foreground/60 mt-1">
                    de {stats.total} resena{stats.total !== 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <p className="text-foreground/70 text-sm">Sin resenas</p>
              )}
            </CardContent>
          </Card>

          {/* Distribution -- spans 2 cols for better proportions */}
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground/70">Distribucion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((r) => (
                <DistributionBar
                  key={r}
                  label={String(r)}
                  count={stats.distribution[r] ?? 0}
                  total={stats.total}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <MessageSquare className="h-10 w-10 text-foreground/70" />
            <p className="text-foreground/75">
              {ratingFilter !== "ALL" ? "No hay reseñas con esa calificación." : "Aún no hay reseñas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.customerName}</span>
                        <span className="text-xs text-foreground/70">{r.customerPhone}</span>
                        <Badge variant="outline" className="text-xs">
                          {sourceLabel[r.source] ?? r.source}
                        </Badge>
                      </div>
                      <StarRating rating={r.rating} />
                      {r.comment && (
                        <p className="text-sm text-foreground/70 mt-2">{r.comment}</p>
                      )}
                    </div>
                    <p className="text-xs text-foreground/70 shrink-0">{formatDate(r.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground/75">
                Pagina {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReviews(pagination.page - 1)}
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchReviews(pagination.page + 1)}
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
