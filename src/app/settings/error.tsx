"use client"

import { Button } from "@/components/ui/button"

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="text-lg font-semibold">Error al cargar la configuración</p>
      <p className="text-sm text-muted-foreground">Intenta de nuevo o contacta soporte.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
