"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg font-semibold">Error al cargar las reservas</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Ocurrió un problema al obtener los datos. Esto puede ser temporal.
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </CardContent>
    </Card>
  )
}
