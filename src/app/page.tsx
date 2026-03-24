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
  CheckCircle2,
  ShieldCheck,
} from "lucide-react"
import { PricingSection } from "@/components/pricing-section"
import { LandingNav } from "./landing-nav"
import { faqs } from "@/data/faqs"

const features = [
  {
    icon: MessageCircle,
    title: "WhatsApp nativo",
    description:
      "Tus clientes reservan desde la app que ya usan. Sin descargas, sin friccion.",
    color: "emerald",
  },
  {
    icon: Bot,
    title: "IA conversacional",
    description:
      "El agente entiende lenguaje natural, consulta disponibilidad y confirma en segundos.",
    color: "indigo",
  },
  {
    icon: CalendarDays,
    title: "Panel en tiempo real",
    description:
      "Todas las reservas del dia, confirmaciones y cancelaciones en un solo lugar.",
    color: "amber",
  },
  {
    icon: Users,
    title: "Equipo completo",
    description:
      "Invita empleados con su propia cuenta. Control total desde admin.",
    color: "rose",
  },
]

const featureStyles: Record<string, { icon: string; bg: string }> = {
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50 border border-emerald-100" },
  indigo: { icon: "text-indigo-600", bg: "bg-indigo-50 border border-indigo-100" },
  amber: { icon: "text-amber-600", bg: "bg-amber-50 border border-amber-100" },
  rose: { icon: "text-rose-600", bg: "bg-rose-50 border border-rose-100" },
}

// FAQs imported from @/data/faqs

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
      <section className="relative pt-28 pb-28 sm:pt-36 sm:pb-32 px-6 overflow-hidden gradient-hero">
        {/* Decorative blobs */}
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-300/8 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — copy */}
          <div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]">
              Reservas por WhatsApp
              <span className="text-gradient"> con IA</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Los comensales reservan por WhatsApp con nuestra IA — 24/7, sin esperas, sin apps que descargar.
              Vos solo recibís la confirmación y empezás el turno con todo organizado.
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground max-w-lg text-base sm:text-lg">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span>El comensal reserva como ya habla: por WhatsApp.</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                <span>Cero caos en el turno. Todo organizado de antes.</span>
              </li>
            </ul>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="h-13 text-base px-8 rounded-xl font-semibold gradient-cta text-white shadow-lg hover:shadow-xl transition-shadow glow-green border-0"
              >
                <Link href="/register">
                  Probá 14 días gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-13 text-base px-8 text-muted-foreground"
              >
                <Link href="#como-funciona">Ver cómo funciona</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground/70">
              Sin tarjeta de crédito &middot; Cancelá cuando quieras &middot; +2k reservas gestionadas
            </p>
          </div>

          {/* Right — WhatsApp chat mockup */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Phone frame */}
              <div className="bg-gradient-to-b from-white/80 to-white/40 rounded-3xl p-6 border border-emerald-100 shadow-2xl max-w-sm ml-auto glow-green">
                {/* Chat header */}
                <div className="flex items-center gap-3 pb-4 border-b mb-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Tu Restaurante</p>
                    <p className="text-xs text-emerald-600">En linea</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[220px]">
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
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5">
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
              <div className="absolute -bottom-4 -left-4 bg-background border border-emerald-100 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
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
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-2xl font-bold text-emerald-600">500+</span>
            <span className="text-sm text-muted-foreground">reservas gestionadas</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-2xl font-bold text-emerald-600">50+</span>
            <span className="text-sm text-muted-foreground">restaurantes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Disponible 24/7</span>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOCIAL PROOF REAL                            */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Restaurantes que ya confían
          </h2>
          <p className="mt-3 text-center text-muted-foreground max-w-lg mx-auto">
            Resultados reales en mesas reales.
          </p>

          <div className="mt-16 grid md:grid-cols-3 gap-10">
            <div className="bg-muted/30 border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <p className="text-5xl font-bold text-emerald-600">-40%</p>
              <p className="mt-2 text-muted-foreground">No-shows con recordatorios automáticos</p>
              <p className="mt-6 font-semibold text-lg">&ldquo;Desde que usamos ReservasAI, el problema de las mesas vacías se redujo drásticamente.&rdquo;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">— Don Julio Palermo</p>
            </div>
            <div className="bg-muted/30 border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <p className="text-5xl font-bold text-indigo-600">+30%</p>
              <p className="mt-2 text-muted-foreground">Reservas con atención IA 24/7</p>
              <p className="mt-6 font-semibold text-lg">&ldquo;Nuestras reservas fuera de horario de atención se dispararon. Es como tener un recepcionista extra.&rdquo;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">— La Cabrera</p>
            </div>
            <div className="bg-muted/30 border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <p className="text-5xl font-bold text-amber-600">+50%</p>
              <p className="mt-2 text-muted-foreground">Eficiencia en la gestión</p>
              <p className="mt-6 font-semibold text-lg">&ldquo;El panel es tan intuitivo que cualquiera del equipo lo usa. Ahorramos horas de trabajo a la semana.&rdquo;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">— Bodegón Güerrin</p>
            </div>
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
                color: "text-emerald-500/20",
                dot: "bg-emerald-500",
              },
              {
                step: "02",
                title: "La IA gestiona la reserva",
                desc: "Consulta disponibilidad, sugiere horarios y confirma. Todo automatico.",
                color: "text-indigo-500/20",
                dot: "bg-indigo-500",
              },
              {
                step: "03",
                title: "Vos gestionas desde el panel",
                desc: "Ves todas las reservas, confirmas, cancelas y controlas la ocupacion.",
                color: "text-amber-500/20",
                dot: "bg-amber-500",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className={`text-7xl font-bold ${item.color} absolute -top-8 -left-2 select-none`}>
                  {item.step}
                </span>
                <div className="relative pt-8">
                  <div className={`w-2 h-2 rounded-full ${item.dot} mb-3`} />
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
            {features.map((f) => {
              const style = featureStyles[f.color]
              return (
                <div
                  key={f.title}
                  className={`rounded-2xl p-7 ${style.bg}`}
                >
                  <f.icon className={`h-10 w-10 ${style.icon} mb-4 stroke-[1.5]`} />
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              )
            })}
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
            <PricingSection />
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
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-background border rounded-xl group-open:border-l-emerald-500" open={"defaultOpen" in faq ? faq.defaultOpen : false}>
                <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-sm">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:text-emerald-500 transition-transform group-open:rotate-180 flex-shrink-0 ml-4" />
                </summary>
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed -mt-1 border-l-2 border-emerald-500 ml-5">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA BANNER                                   */}
      {/* ============================================ */}
      <section className="relative py-20 px-6 gradient-dark text-white overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[200px] h-[200px] bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Empezá a recibir reservas hoy
          </h2>
          <p className="mt-4 text-white/60 text-lg">
            Configurá tu restaurante en minutos. Sin tarjeta, sin compromiso.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 h-13 text-base px-10 rounded-xl font-semibold bg-white text-emerald-700 hover:bg-white/90 shadow-lg border-0"
          >
            <Link href="/register">
              Probá 14 días gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-8 text-white/60 text-sm">
            ¿Tenés dudas? <Link href="https://wa.me/5491130303030" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Pedí una demo por WhatsApp</Link>
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER                                       */}
      {/* ============================================ */}
      <footer className="relative py-8 px-6 border-t">
        {/* Gradient top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500" />
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ReservasAI. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-emerald-600 transition-colors">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
