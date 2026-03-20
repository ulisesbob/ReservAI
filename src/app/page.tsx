import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import {
  MessageCircle,
  CalendarDays,
  Bot,
  Users,
  ChevronDown,
  ArrowRight,
  Zap,
  Clock,
} from "lucide-react"
import { PricingToggle } from "./pricing-toggle"
import { LandingNav } from "./landing-nav"

const features = [
  {
    icon: MessageCircle,
    title: "WhatsApp nativo",
    description:
      "Tus clientes reservan desde la app que ya usan. Sin descargas, sin friccion.",
  },
  {
    icon: Bot,
    title: "IA conversacional",
    description:
      "El agente entiende lenguaje natural, consulta disponibilidad y confirma en segundos.",
  },
  {
    icon: CalendarDays,
    title: "Panel en tiempo real",
    description:
      "Todas las reservas del dia, confirmaciones y cancelaciones en un solo lugar.",
  },
  {
    icon: Users,
    title: "Equipo completo",
    description:
      "Invita empleados con su propia cuenta. Control total desde admin.",
  },
]

const faqs = [
  {
    q: "Que pasa al terminar el trial?",
    a: "Si no elegis un plan, se bloquea el acceso al panel. Tus datos se mantienen y podes reactivar en cualquier momento.",
  },
  {
    q: "Puedo cancelar en cualquier momento?",
    a: "Si, podes cancelar tu suscripcion cuando quieras. No hay permanencia minima.",
  },
  {
    q: "Que medios de pago aceptan?",
    a: "Aceptamos tarjetas de credito/debito, transferencia bancaria y todos los medios de MercadoPago.",
  },
  {
    q: "Necesito un numero de WhatsApp Business?",
    a: "Si, necesitas una cuenta de WhatsApp Business API (Meta) para recibir reservas por WhatsApp.",
  },
  {
    q: "Cuantas reservas puedo gestionar?",
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
      <LandingNav />

      {/* ============================================ */}
      {/* HERO — the star of the page                  */}
      {/* ============================================ */}
      <section className="relative pt-28 pb-28 sm:pt-36 sm:pb-32 px-6 overflow-hidden">
        {/* Background gradient — subtle, not distracting */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06]" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — copy */}
          <div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]">
              Reservas por
              <br />
              WhatsApp
              <br />
              <span className="text-primary/20">con IA</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Tu restaurante recibe reservas automaticas por WhatsApp.
              Un agente de IA atiende a tus clientes 24/7 mientras vos gestionas
              todo desde un panel simple.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="h-13 text-base px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <Link href="/register">
                  Proba 14 dias gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-13 text-base px-8 text-muted-foreground"
              >
                <Link href="#como-funciona">Ver como funciona</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground/70">
              Sin tarjeta de credito &middot; Cancela cuando quieras
            </p>
          </div>

          {/* Right — WhatsApp chat mockup */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Phone frame */}
              <div className="bg-gradient-to-b from-muted/80 to-muted/40 rounded-3xl p-6 border shadow-2xl max-w-sm ml-auto">
                {/* Chat header */}
                <div className="flex items-center gap-3 pb-4 border-b mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Tu Restaurante</p>
                    <p className="text-xs text-green-600">En linea</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[220px]">
                      <p className="text-sm">Hola, quiero reservar para 4 personas el sabado</p>
                    </div>
                  </div>

                  {/* Bot message */}
                  <div className="flex justify-start">
                    <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[240px] shadow-sm">
                      <p className="text-sm">
                        Perfecto! Tengo disponibilidad el sabado a las 20:00 y 21:30.
                        Cual preferis?
                      </p>
                    </div>
                  </div>

                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5">
                      <p className="text-sm">20:00 por favor!</p>
                    </div>
                  </div>

                  {/* Bot confirmation */}
                  <div className="flex justify-start">
                    <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[240px] shadow-sm">
                      <p className="text-sm">
                        Listo! Reserva confirmada para 4 personas, sabado a las 20:00.
                        Te esperamos!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="mt-4 bg-background border rounded-full h-10 flex items-center px-4">
                  <span className="text-xs text-muted-foreground">Escribi un mensaje...</span>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-background border rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Respuesta en 3 seg</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOCIAL PROOF BAR                             */}
      {/* ============================================ */}
      <section className="py-8 border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-x-16 gap-y-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold">500+</span>
            <span className="text-sm text-muted-foreground">reservas gestionadas</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold">50+</span>
            <span className="text-sm text-muted-foreground">restaurantes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Disponible 24/7</span>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS                                 */}
      {/* ============================================ */}
      <section id="como-funciona" className="py-28 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center tracking-tight">
            Como funciona
          </h2>
          <p className="mt-3 text-center text-muted-foreground max-w-lg mx-auto">
            Tres pasos. Sin configuracion tecnica. En minutos estas recibiendo reservas.
          </p>

          <div className="mt-20 grid md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                step: "01",
                title: "Tu cliente escribe por WhatsApp",
                desc: "Como cualquier otro chat. Sin apps, sin links, sin formularios.",
              },
              {
                step: "02",
                title: "La IA gestiona la reserva",
                desc: "Consulta disponibilidad, sugiere horarios y confirma. Todo automatico.",
              },
              {
                step: "03",
                title: "Vos gestionas desde el panel",
                desc: "Ves todas las reservas, confirmas, cancelas y controlas la ocupacion.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-7xl font-bold text-primary/[0.07] absolute -top-8 -left-2 select-none">
                  {item.step}
                </span>
                <div className="relative pt-8">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURES                                     */}
      {/* ============================================ */}
      <section id="features" className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center tracking-tight">
            Todo incluido
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Sin modulos, sin extras. Un plan con todo.
          </p>

          <div className="mt-14 grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`rounded-2xl p-7 ${
                  i % 2 === 0
                    ? "bg-primary/[0.04] border border-primary/[0.08]"
                    : "bg-background border"
                }`}
              >
                <f.icon className="h-10 w-10 text-primary mb-4 stroke-[1.5]" />
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PRICING                                      */}
      {/* ============================================ */}
      <section id="pricing" className="py-28 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center tracking-tight">
            Precio simple, sin sorpresas
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Un solo plan. Todo incluido. Paga mensual o ahorra con el anual.
          </p>
          <div className="mt-14">
            <PricingToggle />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ                                          */}
      {/* ============================================ */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center tracking-tight mb-12">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group bg-background border rounded-xl">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-sm">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0 ml-4" />
                </summary>
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed -mt-1">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA BANNER                                   */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-foreground text-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Empeza a recibir reservas hoy
          </h2>
          <p className="mt-4 text-background/60 text-lg">
            Configura tu restaurante en minutos. Sin tarjeta, sin compromiso.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 h-13 text-base px-10 rounded-xl font-semibold bg-background text-foreground hover:bg-background/90 shadow-lg"
          >
            <Link href="/register">
              Proba 14 dias gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER                                       */}
      {/* ============================================ */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ReservaYa. Todos los derechos reservados.</p>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Iniciar Sesion
          </Link>
        </div>
      </footer>
    </div>
  )
}
