"use client"

import { Button } from "@/components/ui/button"

interface StepConfirmationProps {
  restaurantName: string
  slug: string
  timezone: string
  maxCapacity: string
  maxPartySize: string
  openDays: string[]
  hasWhatsApp: boolean
  hasKnowledgeBase: boolean
  onFinish: () => void
  onBack: () => void
  loading: boolean
}

export function StepConfirmation({ restaurantName, slug, timezone, maxCapacity, maxPartySize, openDays, hasWhatsApp, hasKnowledgeBase, onFinish, onBack, loading }: StepConfirmationProps) {
  const bookingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/book/${slug}`
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-muted/60 border border-border/50 p-5 space-y-3">
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Restaurante</span>
          <span className="text-sm font-medium">{restaurantName}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Zona horaria</span>
          <span className="text-sm font-medium">{timezone.split("/").pop()?.replace(/_/g, " ")}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Capacidad</span>
          <span className="text-sm font-medium">{maxCapacity} personas</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Max por reserva</span>
          <span className="text-sm font-medium">{maxPartySize} personas</span>
        </div>
        <div className="flex justify-between items-start py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Dias abiertos</span>
          <span className="text-sm font-medium text-right max-w-[60%]">{openDays.length > 0 ? openDays.join(", ") : "Ninguno"}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/40">
          <span className="text-sm text-muted-foreground">WhatsApp Bot</span>
          <span className={`text-sm font-medium ${hasWhatsApp ? "text-green-600" : "text-muted-foreground"}`}>{hasWhatsApp ? "Configurado" : "No configurado"}</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-sm text-muted-foreground">Base de conocimiento</span>
          <span className={`text-sm font-medium ${hasKnowledgeBase ? "text-green-600" : "text-muted-foreground"}`}>{hasKnowledgeBase ? "Configurada" : "No configurada"}</span>
        </div>
      </div>
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-300">
        <p className="font-medium mb-1">Tu link de reservas</p>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">{bookingUrl}</a>
      </div>
      <Button className="w-full h-11 text-sm font-medium" onClick={onFinish} disabled={loading}>{loading ? "Guardando..." : "Ir al dashboard"}</Button>
      <Button variant="outline" className="w-full h-11" onClick={onBack}>Modificar</Button>
    </div>
  )
}
