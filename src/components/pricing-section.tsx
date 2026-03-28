"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight } from "lucide-react"

const allFeatures = [
  "Reservas ilimitadas",
  "Agente IA por WhatsApp 24/7",
  "Panel de gestión en tiempo real",
  "Multi-usuario (admin + empleados)",
  "Knowledge Base personalizable",
  "Recordatorios automáticos",
  "Reportes y métricas",
  "Soporte por WhatsApp y email",
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  const monthlyPrice = 25000
  const yearlyTotal = 240000
  const yearlyPerMonth = Math.round(yearlyTotal / 12)

  const displayPrice = annual ? yearlyPerMonth : monthlyPrice
  const billingLabel = annual ? "/mes (facturado anual)" : "/mes"

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-full p-1">
        <button
          aria-pressed={!annual}
          aria-label="Facturación mensual"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all motion-reduce:transition-none ${
            !annual
              ? "gradient-cta text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          aria-pressed={annual}
          aria-label="Facturación anual"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all motion-reduce:transition-none ${
            annual
              ? "gradient-cta text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(true)}
        >
          Anual <Badge className="ml-2 bg-amber-500 text-white hover:bg-amber-500">-20%</Badge>
        </button>
      </div>

      {/* Single Plan Card */}
      <div className="w-full max-w-lg">
        <div className="relative bg-background border-2 border-emerald-500 rounded-2xl p-10 shadow-lg">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex gap-2">
            <Badge className="rounded-full px-4 py-1 text-xs font-semibold shadow-md bg-amber-500 text-white hover:bg-amber-500 border-0">
              Todo incluido
            </Badge>
            <Badge className="rounded-full px-4 py-1 text-xs font-semibold shadow-md bg-rose-500 text-white hover:bg-rose-500 border-0">
              Precio de lanzamiento
            </Badge>
          </div>

          <div className="text-center pt-2">
            <h3 className="text-lg font-semibold text-muted-foreground tracking-wide uppercase">
              ReservasAI
            </h3>

            <div className="mt-6 mb-2">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight text-emerald-600">
                ${displayPrice.toLocaleString("es-AR")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {billingLabel}
            </p>
            {annual && (
              <p className="text-xs text-emerald-600 font-medium mt-1">
                ${yearlyTotal.toLocaleString("es-AR")} facturado por año — Ahorrás ${((monthlyPrice * 12) - yearlyTotal).toLocaleString("es-AR")}
              </p>
            )}
          </div>

          <div className="my-8 h-px bg-border" />

          <ul className="space-y-3.5">
            {allFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-emerald-100">
                  <Check className="h-3 w-3 text-emerald-600" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            asChild
            size="lg"
            className="w-full mt-8 h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow motion-reduce:transition-none gradient-cta text-white border-0"
          >
            <Link href="/register">
              Empeza gratis — 14 dias de prueba
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-2 text-center text-xs text-emerald-600 font-medium">
            Empeza en 5 minutos. Sin tarjeta de credito.
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Cancelas cuando quieras, sin letra chica.
          </p>
        </div>
      </div>

      {/* Trust signals */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Sin tarjeta de credito</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Setup en 10 minutos</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Soporte humano incluido</span>
        </div>
      </div>
    </div>
  )
}
