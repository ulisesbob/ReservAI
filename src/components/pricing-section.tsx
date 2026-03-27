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
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
            !annual
              ? "gradient-cta text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
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
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="rounded-full px-4 py-1 text-xs font-semibold shadow-md bg-amber-500 text-white hover:bg-amber-500 border-0">
              Todo incluido
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
            className="w-full mt-8 h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow gradient-cta text-white border-0"
          >
            <Link href="/register">
              Empezá tu prueba gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-2">
        14 días gratis. Sin tarjeta de crédito. Cancelás cuando quieras.
      </p>
    </div>
  )
}
