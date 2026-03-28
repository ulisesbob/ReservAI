"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"

const allFeatures = [
  "Reservas ilimitadas",
  "Agente IA por WhatsApp 24/7",
  "Panel de gestion en tiempo real",
  "Multi-usuario (admin + empleados)",
  "Knowledge Base personalizable",
  "Recordatorios automaticos",
  "Reportes y metricas",
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
          aria-label="Facturacion mensual: seleccionar plan de pago mensual"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all motion-reduce:transition-none ${
            !annual
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          aria-pressed={annual}
          aria-label="Facturacion anual: seleccionar plan de pago anual con descuento del 20%"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all motion-reduce:transition-none ${
            annual
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(true)}
        >
          Anual
          <span className="ml-2 text-xs opacity-60">-20%</span>
        </button>
      </div>

      {/* Single Plan Card */}
      <div className="w-full max-w-lg">
        <div className="border rounded-lg p-10">
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-4">
              ReservasAI
            </p>

            <div className="mb-1">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                ${displayPrice.toLocaleString("es-AR")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {billingLabel}
            </p>
            {annual && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                ${yearlyTotal.toLocaleString("es-AR")} facturado por ano — Ahorras ${((monthlyPrice * 12) - yearlyTotal).toLocaleString("es-AR")}
              </p>
            )}
          </div>

          <div className="my-8 h-px bg-border" />

          <ul className="space-y-3.5">
            {allFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            asChild
            size="lg"
            className="w-full mt-10 h-14 text-base font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm border-0"
          >
            <Link href="/register">
              Empeza gratis — 14 dias de prueba
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {/* Trust signals directly under button */}
          <div className="mt-4 flex flex-col gap-1 text-center">
            <p className="text-xs text-muted-foreground/50">
              Sin tarjeta de credito. Setup en 10 minutos.
            </p>
            <p className="text-xs text-muted-foreground/40">
              Cancelas cuando quieras, sin letra chica.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
