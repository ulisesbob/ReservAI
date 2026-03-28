import { redirect } from "next/navigation"
import type { Metadata } from "next"
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
  Clock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react"
import { PricingSection } from "@/components/pricing-section"
import { Logo } from "@/components/logo"
import { LandingNav } from "./landing-nav"
import { faqs } from "@/data/faqs"

const siteUrl = "https://www.reservasai.com"
const schemaDescription =
  "Automatiza las reservas de tu restaurante con un bot de IA en WhatsApp. Tus clientes reservan 24/7 en segundos, sin apps ni formularios. Probalo gratis 14 dias."

// ─── JSON-LD schema objects (landing page only) ────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ReservasAI",
  url: siteUrl,
  logo: `${siteUrl}/favicon.ico`,
  description: schemaDescription,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["Spanish"],
  },
}

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ReservasAI",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Restaurant Management",
  operatingSystem: "Web",
  url: siteUrl,
  description: schemaDescription,
  inLanguage: "es",
  offers: {
    "@type": "Offer",
    price: "25000",
    priceCurrency: "ARS",
    availability: "https://schema.org/InStock",
    url: `${siteUrl}/register`,
    priceValidUntil: new Date(new Date().getFullYear() + 1, 0, 1)
      .toISOString()
      .split("T")[0],
  },
  creator: {
    "@type": "Organization",
    name: "ReservasAI",
    url: siteUrl,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "45",
    bestRating: "5",
    worstRating: "1",
  },
}

export const metadata: Metadata = {
  title: "ReservasAI | Reservas por WhatsApp con IA para Restaurantes",
  description:
    "Automatiza las reservas de tu restaurante con un bot de IA en WhatsApp. Tus clientes reservan 24/7 en segundos, sin apps ni formularios. Probalo gratis 14 dias.",
  alternates: {
    canonical: "https://www.reservasai.com",
  },
}

const features = [
  {
    icon: MessageCircle,
    title: "Reservas por WhatsApp en 30 segundos",
    description:
      "Desde la app que ya usan todos los dias. Sin descargas, sin friccion, sin que tu equipo levante el telefono.",
    highlight: true,
  },
  {
    icon: Bot,
    title: "IA que atiende 24/7",
    description:
      "Entiende lenguaje natural, consulta disponibilidad y confirma al instante. Incluso a las 2 AM.",
  },
  {
    icon: CalendarDays,
    title: "Panel en tiempo real",
    description:
      "Todas las reservas, confirmaciones y cancelaciones. Cero sorpresas en el turno.",
  },
  {
    icon: Users,
    title: "Multi-usuario",
    description:
      "Invita empleados con su propia cuenta. Cada uno ve lo que necesita, desde el celular o la compu.",
  },
]

// FAQs imported from @/data/faqs

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        id="reservasai-org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        id="reservasai-software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        id="reservasai-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    <div className="min-h-screen flex flex-col">
      <LandingNav />

      <main id="main-content">
      {/* ============================================ */}
      {/* HERO                                         */}
      {/* ============================================ */}
      <section className="relative pt-32 pb-28 sm:pt-40 sm:pb-36 px-6 gradient-hero">
        <div className="relative max-w-5xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left column — copy */}
          <div>
            {/* Pain point subtitle */}
            <p className="text-sm sm:text-base text-muted-foreground/70 tracking-wide uppercase mb-4 animate-fade-up">
              Tu equipo pierde horas atendiendo el telefono para tomar reservas
            </p>

            {/* H1 — large editorial typography */}
            <h1 className="text-5xl md:text-7xl lg:text-7xl font-bold tracking-tight leading-[0.95] max-w-4xl animate-fade-up animate-delay-100">
              Reservas por WhatsApp.
              <br />
              <span className="text-muted-foreground/40">Automáticas.</span>
            </h1>

            {/* Solution copy */}
            <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed animate-fade-up animate-delay-200">
              Un bot de IA atiende tu WhatsApp 24/7, toma reservas en segundos
              y organiza tu turno. Sin apps, sin formularios, sin llamadas perdidas.
            </p>

            {/* Single primary CTA + text link */}
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-6 animate-fade-up animate-delay-300">
              <Button
                asChild
                size="lg"
                className="h-14 text-base px-10 rounded-lg font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-sm border-0"
              >
                <Link href="/register">
                  Empeza gratis — 14 dias
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="#como-funciona"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 mt-3 sm:mt-4"
              >
                Mira cómo funciona
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground/50 animate-fade-up animate-delay-400">
              Sin tarjeta de credito &middot; Setup en 10 minutos &middot; Cancela cuando quieras
            </p>
          </div>

          {/* Right column — WhatsApp chat mockup */}
          <div className="hidden lg:block animate-fade-up animate-delay-300">
            <div className="relative -rotate-2">
              {/* Animated badge */}
              <div className="absolute -top-4 -right-2 z-10 flex items-center gap-2 bg-background border rounded-full px-3 py-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Respuesta en 3 seg</span>
              </div>

              {/* Chat card */}
              <div className="rounded-2xl border shadow-lg overflow-hidden bg-background">
                {/* Header */}
                <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Tu Restaurante</p>
                    <p className="text-[11px] text-white/60">en linea</p>
                  </div>
                </div>

                {/* Chat body */}
                <div className="px-4 py-5 space-y-3 bg-[#f0ebe3] dark:bg-muted/30 min-h-[220px]">
                  {/* Customer */}
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] dark:bg-green-900/40 rounded-lg rounded-tr-none px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-sm text-foreground">Hola, quiero reservar para 4 el sábado</p>
                      <p className="text-[10px] text-muted-foreground/60 text-right mt-0.5">20:12</p>
                    </div>
                  </div>

                  {/* Bot */}
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-background rounded-lg rounded-tl-none px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-sm text-foreground">Tengo disponibilidad a las 20:00 y 21:30. ¿Cuál preferís?</p>
                      <p className="text-[10px] text-muted-foreground/60 text-right mt-0.5">20:12</p>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] dark:bg-green-900/40 rounded-lg rounded-tr-none px-3 py-2 max-w-[75%] shadow-sm">
                      <p className="text-sm text-foreground">20:00</p>
                      <p className="text-[10px] text-muted-foreground/60 text-right mt-0.5">20:12</p>
                    </div>
                  </div>

                  {/* Bot confirmation */}
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-background rounded-lg rounded-tl-none px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-sm text-foreground">
                        <CheckCircle2 className="inline h-3.5 w-3.5 text-green-600 mr-1 -mt-0.5" />
                        Reserva confirmada para 4 personas, sábado 20:00
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 text-right mt-0.5">20:12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TRUST STRIP — minimal horizontal line        */}
      {/* ============================================ */}
      <section className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-muted-foreground/60 tracking-wide">
          <span>14 dias gratis</span>
          <span className="hidden sm:inline text-border">|</span>
          <span>Sin tarjeta de credito</span>
          <span className="hidden sm:inline text-border">|</span>
          <span>IA disponible 24/7</span>
          <span className="hidden sm:inline text-border">|</span>
          <span>Activo en 10 minutos</span>
        </div>
      </section>

      {/* ============================================ */}
      {/* TESTIMONIALS — huge stat numbers              */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-background" aria-labelledby="testimonials-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="testimonials-heading" className="text-sm uppercase tracking-widest text-muted-foreground/50 mb-16">
            Resultados reales
          </h2>

          <div className="grid md:grid-cols-3 gap-16 md:gap-12">
            {/* Stat 1 */}
            <article className="text-left">
              <p className="text-7xl md:text-8xl font-black tracking-tighter leading-none" aria-label="Menos 35 por ciento">
                -35%
              </p>
              <p className="mt-4 text-base font-semibold">Menos no-shows</p>
              <p className="text-sm text-muted-foreground">con recordatorios automaticos</p>
              <blockquote className="mt-6 border-l-2 border-foreground/10 pl-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  &ldquo;Antes perdiamos 6 o 7 mesas por noche por gente que no venia. Con los recordatorios bajo muchisimo.&rdquo;
                </p>
                <footer className="mt-2 text-xs text-muted-foreground/50">Carlos M., Restaurante El Fogon</footer>
              </blockquote>
            </article>

            {/* Stat 2 */}
            <article className="text-left">
              <p className="text-7xl md:text-8xl font-black tracking-tighter leading-none" aria-label="Mas 25 por ciento">
                +25%
              </p>
              <p className="mt-4 text-base font-semibold">Mas reservas</p>
              <p className="text-sm text-muted-foreground">captadas fuera de horario</p>
              <blockquote className="mt-6 border-l-2 border-foreground/10 pl-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  &ldquo;La mayoria reserva a la noche, cuando el restaurante esta cerrado. Ahora la IA les responde al toque.&rdquo;
                </p>
                <footer className="mt-2 text-xs text-muted-foreground/50">Maria L., Parrilla Don Carlos</footer>
              </blockquote>
            </article>

            {/* Stat 3 */}
            <article className="text-left">
              <p className="text-7xl md:text-8xl font-black tracking-tighter leading-none" aria-label="3 horas menos">
                3hs
              </p>
              <p className="mt-4 text-base font-semibold">Menos gestion</p>
              <p className="text-sm text-muted-foreground">por semana para tu equipo</p>
              <blockquote className="mt-6 border-l-2 border-foreground/10 pl-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  &ldquo;Mi encargada dejo de atender el telefono todo el dia. Ahora se dedica a lo que importa: los clientes en sala.&rdquo;
                </p>
                <footer className="mt-2 text-xs text-muted-foreground/50">Roberto S., Trattoria Bella</footer>
              </blockquote>
            </article>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS                                 */}
      {/* ============================================ */}
      <section id="como-funciona" className="py-20 px-6 bg-background border-t" aria-labelledby="how-it-works-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Cómo funciona
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg">
            Tres pasos. Sin configuración técnica. En 10 minutos estás recibiendo reservas.
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
                <span className="text-8xl font-black text-foreground/[0.04] absolute -top-10 -left-2 select-none leading-none" aria-hidden="true">
                  {item.step}
                </span>
                <div className="relative pt-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground mb-4" />
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
      {/* FEATURES — asymmetric layout                 */}
      {/* ============================================ */}
      <section id="funciones" className="py-20 px-6 bg-background border-t" aria-labelledby="features-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Lo que tu restaurante necesita
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg">
            Sin modulos, sin extras. Un plan con todo incluido.
          </p>

          {/* Asymmetric grid: 1 large + 3 small */}
          <div className="mt-16 grid md:grid-cols-2 gap-4">
            {/* Large card — WhatsApp reservations (main feature) */}
            <div className="md:row-span-3 border rounded-lg p-10 flex flex-col justify-between bg-foreground text-background">
              <div>
                <MessageCircle className="h-8 w-8 mb-6 opacity-60 stroke-[1.5]" />
                <h3 className="text-2xl font-bold leading-tight">
                  Tus clientes reservan en 30 segundos
                </h3>
                <p className="mt-3 text-base opacity-60 leading-relaxed max-w-sm">
                  Un bot de IA atiende tu WhatsApp 24/7. Confirma reservas, sugiere horarios y organiza tu turno. Sin intervención humana.
                </p>
              </div>
              <div className="mt-10 pt-6 border-t border-background/10 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 opacity-40" />
                <p className="text-sm opacity-40">Integración directa con WhatsApp</p>
              </div>
            </div>

            {/* 3 smaller cards */}
            {features.slice(1).map((f) => (
              <div
                key={f.title}
                className="border rounded-lg p-8"
              >
                <f.icon className="h-6 w-6 text-muted-foreground mb-4 stroke-[1.5]" />
                <h3 className="text-base font-semibold">{f.title}</h3>
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
      <section id="precios" className="py-28 px-6 bg-background border-t" aria-labelledby="pricing-heading">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
            Precio de lanzamiento — Primeros 50 restaurantes
          </p>
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Precio simple, sin sorpresas
          </h2>
          <p className="mt-3 text-muted-foreground">
            Un solo plan con todo incluido. Paga mensual o ahorra con el anual.
          </p>
          <div className="mt-8">
            <PricingSection />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ                                          */}
      {/* ============================================ */}
      <section id="faq" className="py-20 px-6 bg-background border-t" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto">
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-muted-foreground mb-14">
            Todo lo que necesitas saber antes de empezar.
          </p>
          <div className="space-y-0 divide-y">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group py-6 first:pt-0 last:pb-0"
                open={"defaultOpen" in faq ? faq.defaultOpen : false}
              >
                <summary className="flex items-center justify-between cursor-pointer font-medium text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-sm">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 text-muted-foreground/40 transition-transform motion-reduce:transition-none group-open:rotate-180 motion-reduce:transform-none flex-shrink-0 ml-6" />
                </summary>
                <p className="pt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA — full-width dark                  */}
      {/* ============================================ */}
      <section className="py-28 px-6 gradient-dark text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Empeza a recibir reservas hoy
          </h2>
          <p className="mt-6 text-white/40 text-lg max-w-xl mx-auto">
            Configura tu restaurante en 10 minutos. Sin tarjeta de credito, sin compromiso.
          </p>

          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="h-14 text-base px-12 rounded-lg font-semibold bg-white text-black hover:bg-white/90 shadow-sm border-0"
            >
              <Link href="/register">
                Empeza tu prueba gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Guarantee under button */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white/30" />
            <span className="text-sm text-white/40">Si no te sirve en 14 dias, cancelas sin pagar un peso</span>
          </div>

          <p className="mt-12 text-white/30 text-sm">
            Tenes dudas?{" "}
            <Link href="mailto:hola@reservasai.com" className="underline hover:text-white/60 transition-colors">
              Contactanos
            </Link>
          </p>
        </div>
      </section>

      </main>

      {/* ============================================ */}
      {/* FOOTER                                       */}
      {/* ============================================ */}
      <footer className="py-8 px-6 border-t" role="contentinfo">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Logo size="sm" />
            <span>&copy; {new Date().getFullYear()} Todos los derechos reservados.</span>
          </p>
          <nav aria-label="Footer">
            <ul className="flex items-center gap-4">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terminos
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Iniciar sesion
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
    </>
  )
}
