import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-emerald-500 mb-4">404</p>
        <h1 className="text-2xl font-semibold mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
