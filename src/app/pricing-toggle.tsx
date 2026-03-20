"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const features = [
  "Reservas ilimitadas",
  "Agente IA por WhatsApp",
  "Panel de gestion",
  "Multi-usuario (admin + empleados)",
  "Knowledge Base personalizable",
  "Soporte por email",
]

export function PricingToggle() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-full p-1">
        <button
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
            !annual
              ? "bg-foreground text-background shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
            annual
              ? "bg-foreground text-background shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setAnnual(true)}
        >
          Anual
        </button>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Gradient glow behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl" />

        <div className="relative bg-background border-2 border-primary/20 rounded-2xl p-8 shadow-2xl">
          {/* Popular badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="rounded-full px-4 py-1 text-xs font-semibold shadow-md">
              Mas popular
            </Badge>
          </div>

          <div className="text-center pt-4">
            <h3 className="text-lg font-semibold text-muted-foreground tracking-wide uppercase">
              ReservaYa Pro
            </h3>

            <div className="mt-6 mb-2">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                ${annual ? "240.000" : "25.000"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              ARS / {annual ? "ano" : "mes"}
              {annual && (
                <span className="ml-2 text-primary font-medium">Ahorra 20%</span>
              )}
            </p>
          </div>

          <div className="my-8 h-px bg-border" />

          <ul className="space-y-3.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                {f}
              </li>
            ))}
          </ul>

          <Button
            asChild
            size="lg"
            className="w-full mt-8 h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <Link href="/register">Proba 14 dias gratis</Link>
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Sin tarjeta de credito. Cancela cuando quieras.
          </p>
        </div>
      </div>
    </div>
  )
}
