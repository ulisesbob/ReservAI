"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3 bg-muted rounded-full p-1">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setAnnual(false)}
        >
          Mensual
        </button>
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setAnnual(true)}
        >
          Anual
        </button>
      </div>

      <Card className="w-full max-w-md border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ReservaYa</CardTitle>
          {annual && <Badge className="w-fit mx-auto">Ahorra 20%</Badge>}
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <span className="text-4xl font-bold">
              ${annual ? "240.000" : "25.000"}
            </span>
            <span className="text-muted-foreground">
              /{annual ? "año" : "mes"}
            </span>
          </div>
          <ul className="space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="w-full">
            <Link href="/register">Proba 14 dias gratis</Link>
          </Button>
          <p className="text-xs text-muted-foreground">Sin tarjeta. Cancela cuando quieras.</p>
        </CardContent>
      </Card>
    </div>
  )
}
