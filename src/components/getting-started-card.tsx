"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Circle, Copy, ExternalLink } from "lucide-react"

interface GettingStartedCardProps {
  hasWhatsApp: boolean
  hasReservation: boolean
  slug: string
}

export function GettingStartedCard({
  hasWhatsApp,
  hasReservation,
  slug,
}: GettingStartedCardProps) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem("onboarding-dismissed") === "true") {
      setDismissed(true)
    }
  }, [])

  const bookingUrl = `https://reservasai.com/book/${slug}`
  // Step 2 (share link) is always considered done once the card is visible
  const allDone = hasWhatsApp && hasReservation

  function handleDismiss() {
    localStorage.setItem("onboarding-dismissed", "true")
    setDismissed(true)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: silently ignore
    }
  }

  if (!mounted || dismissed) return null

  const steps = [
    {
      label: "Configurá WhatsApp",
      done: hasWhatsApp,
      action: (
        <Link
          href="/settings/whatsapp"
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 flex items-center gap-1"
        >
          Ir a configuración <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      label: "Compartí tu link de reservas",
      done: true,
      action: (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
            {bookingUrl}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 flex items-center gap-1"
            type="button"
          >
            {copied ? (
              <><Check className="h-3 w-3" /> Copiado</>
            ) : (
              <><Copy className="h-3 w-3" /> Copiar</>
            )}
          </button>
        </div>
      ),
    },
    {
      label: "Recibí tu primera reserva",
      done: hasReservation,
      action: null,
    },
  ]

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-background shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              {allDone ? "¡Todo listo! Tu restaurante está activo." : "Primeros pasos"}
            </CardTitle>
            {!allDone && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Completá estos pasos para activar tu restaurante.
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7 px-2 shrink-0"
            onClick={handleDismiss}
          >
            Cerrar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <p
                className={`text-sm font-medium leading-tight ${step.done ? "line-through text-muted-foreground" : ""}`}
              >
                {step.label}
              </p>
              {!step.done && step.action && (
                <div>{step.action}</div>
              )}
              {step.done && step.action && (
                <div>{step.action}</div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
