import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Reserva<span className="text-primary">Ya</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            El sistema inteligente de reservas para tu restaurante.
            Gestioná tus mesas, recibí reservas por WhatsApp y mantené todo organizado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/login">
              Iniciar Sesion
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8">
            <Link href="/register">
              Registrate
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Reservas por WhatsApp con inteligencia artificial
        </p>
      </div>
    </div>
  )
}
