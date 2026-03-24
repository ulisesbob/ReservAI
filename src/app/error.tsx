"use client"

import { Button } from "@/components/ui/button"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <p className="text-5xl font-bold text-destructive mb-4">Error</p>
        <h1 className="text-2xl font-semibold mb-2">Algo salió mal</h1>
        <p className="text-muted-foreground mb-8">
          Ocurrió un error inesperado. Intenta de nuevo o contacta soporte si el problema persiste.
        </p>
        <Button onClick={reset}>Intentar de nuevo</Button>
      </div>
    </div>
  )
}
