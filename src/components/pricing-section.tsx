"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface Plan {
  name: string
  priceUsdMonthly: number
  priceArsMonthly: number
  features: string[]
  highlight?: boolean
}

const plans: Plan[] = [
  {
    name: "Starter",
    priceUsdMonthly: 29,
    priceArsMonthly: 25000,
    features: [
      "Reservas ilimitadas",
      "Agente IA por WhatsApp",
      "Panel de gestión básico",
      "Soporte por email",
    ],
  },
  {
    name: "Pro",
    priceUsdMonthly: 59,
    priceArsMonthly: 50000,
    features: [
      "Todo lo de Starter",
      "Multi-usuario (admin + empleados)",
      "Knowledge Base personalizable",
      "Recordatorios automáticos",
      "Soporte prioritario por WhatsApp",
      "Reportes avanzados",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    priceUsdMonthly: 99,
    priceArsMonthly: 85000,
    features: [
      "Todo lo de Pro",
      "Integraciones personalizadas (ej. POS)",
      "Capacitación y onboarding dedicado",
      "Soporte 24/7 con SLA",
      "Acceso a nuevas funciones beta",
      "Consultoría estratégica trimestral",
    ],
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const savingsPercentage = 0.20 // 20% saving for annual

  const calculatePrice = (monthlyPrice: number) => {
    if (annual) {
      return monthlyPrice * 12 * (1 - savingsPercentage)
    }
    return monthlyPrice
  }

  const formatCurrency = (amount: number, currency: "USD" | "ARS") => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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

      {/* Cards */}
      <div className="mt-8 grid md:grid-cols-3 gap-8 w-full max-w-6xl">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-background border rounded-2xl p-8 shadow-lg flex flex-col justify-between ${
              plan.highlight ? "border-emerald-500 ring-2 ring-emerald-500 scale-105" : "border-muted"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="rounded-full px-4 py-1 text-xs font-semibold shadow-md bg-amber-500 text-white hover:bg-amber-500 border-0">
                  Más popular
                </Badge>
              </div>
            )}

            <div className="text-center pt-4">
              <h3 className="text-lg font-semibold text-muted-foreground tracking-wide uppercase">
                {plan.name}
              </h3>

              <div className="mt-6 mb-2">
                <span className="text-5xl sm:text-6xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(calculatePrice(plan.priceUsdMonthly), "USD")}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                {formatCurrency(calculatePrice(plan.priceArsMonthly), "ARS")} / {annual ? "año" : "mes"}
              </p>
            </div>

            <div className="my-8 h-px bg-border" />

            <ul className="space-y-3.5 flex-grow">
              {plan.features.map((feature) => (
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
              <Link href="/register">Probá 14 días gratis</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Sin tarjeta de crédito. Cancelás cuando quieras.
      </p>
    </div>
  )
}
