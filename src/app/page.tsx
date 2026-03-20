import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, CalendarDays, Settings, Users, ChevronDown } from "lucide-react"
import { PricingToggle } from "./pricing-toggle"

const features = [
  {
    icon: MessageCircle,
    title: "Reservas por WhatsApp",
    description: "Tus clientes reservan chateando con un asistente de IA. Sin apps, sin formularios.",
  },
  {
    icon: CalendarDays,
    title: "Panel de gestion",
    description: "Visualiza, confirma y gestiona todas las reservas del dia desde un solo lugar.",
  },
  {
    icon: Settings,
    title: "Configuracion en minutos",
    description: "Defini tus horarios, capacidad y personaliza el asistente con la info de tu restaurante.",
  },
  {
    icon: Users,
    title: "Multi-usuario",
    description: "Invita a tu equipo. Cada empleado accede al panel con su propia cuenta.",
  },
]

const faqs = [
  {
    q: "¿Que pasa al terminar el trial?",
    a: "Si no elegis un plan, se bloquea el acceso al panel. Tus datos se mantienen y podes reactivar en cualquier momento.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Si, podes cancelar tu suscripcion cuando quieras. No hay permanencia minima.",
  },
  {
    q: "¿Que medios de pago aceptan?",
    a: "Aceptamos tarjetas de credito/debito, transferencia bancaria y todos los medios de MercadoPago.",
  },
  {
    q: "¿Necesito un numero de WhatsApp Business?",
    a: "Si, necesitas una cuenta de WhatsApp Business API (Meta) para recibir reservas por WhatsApp.",
  },
  {
    q: "¿Cuantas reservas puedo gestionar?",
    a: "Ilimitadas. No hay limite de reservas en ningun plan.",
  },
]

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 bg-gradient-to-b from-background to-muted text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Reserva<span className="text-primary">Ya</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
          El sistema inteligente de reservas para tu restaurante.
          Tus clientes reservan por WhatsApp con IA y vos gestionas todo desde un panel simple.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/register">Proba 14 dias gratis</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8">
            <Link href="#pricing">Ver precios</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Precio simple, sin sorpresas</h2>
          <PricingToggle />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer font-medium">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ReservaYa. Todos los derechos reservados.
      </footer>
    </div>
  )
}
