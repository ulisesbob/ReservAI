"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Store, Clock, Check, MessageSquare, Brain } from "lucide-react"
import { StepWhatsApp } from "@/components/onboarding/step-whatsapp"
import { StepKnowledge } from "@/components/onboarding/step-knowledge"
import { StepConfirmation } from "@/components/onboarding/step-confirmation"

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
]

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Madrid",
]

type OperatingHours = Record<string, { open: string; close: string } | null>

const STEPS = [
  { number: 1, label: "Datos", icon: Store },
  { number: 2, label: "Horarios", icon: Clock },
  { number: 3, label: "WhatsApp", icon: MessageSquare },
  { number: 4, label: "Bot", icon: Brain },
  { number: 5, label: "Confirmar", icon: Check },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  // Step 1
  const [restaurantName, setRestaurantName] = useState("")
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires")
  const [maxCapacity, setMaxCapacity] = useState("50")
  const [maxPartySize, setMaxPartySize] = useState("20")

  // Steps 3-4
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("")
  const [whatsappToken, setWhatsappToken] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [knowledgeBase, setKnowledgeBase] = useState("")
  const [slug, setSlug] = useState("")

  // Fetch current restaurant data on mount
  useEffect(() => {
    fetch("/api/settings/restaurant")
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.name ?? "")
        if (data.timezone) setTimezone(data.timezone)
        if (data.maxCapacity) setMaxCapacity(String(data.maxCapacity))
        if (data.maxPartySize) setMaxPartySize(String(data.maxPartySize))
        if (data.slug) setSlug(data.slug)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  // Step 2
  const [hours, setHours] = useState<OperatingHours>(() => {
    const defaults: OperatingHours = {}
    DAYS.forEach((d) => {
      defaults[d.key] = d.key === "domingo" ? null : { open: "12:00", close: "23:00" }
    })
    return defaults
  })

  function toggleDay(key: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { open: "12:00", close: "23:00" },
    }))
  }

  function updateHour(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key]!, [field]: value } : { open: "12:00", close: "23:00", [field]: value },
    }))
  }

  function handleWhatsAppChange(field: string, value: string) {
    if (field === "whatsappPhoneId") setWhatsappPhoneId(value)
    else if (field === "whatsappToken") setWhatsappToken(value)
    else if (field === "openaiApiKey") setOpenaiApiKey(value)
  }

  async function handleFinish() {
    setLoading(true)
    setError("")

    const operatingHours: Record<string, { open: string; close: string }> = {}
    for (const [key, value] of Object.entries(hours)) {
      if (value) operatingHours[key] = value
    }

    try {
      const res = await fetch("/api/settings/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName,
          timezone,
          maxCapacity: Number(maxCapacity),
          maxPartySize: Number(maxPartySize),
          operatingHours,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al guardar")
        return
      }

      // Save WhatsApp settings if provided
      if (whatsappPhoneId.trim() && whatsappToken.trim()) {
        const waRes = await fetch("/api/settings/whatsapp", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsappPhoneId, whatsappToken, openaiApiKey }),
        })
        if (!waRes.ok) {
          const waData = await waRes.json()
          setError(waData.error || "Error al guardar WhatsApp")
          return
        }
      }

      // Save knowledge base if provided
      if (knowledgeBase.trim()) {
        const kbRes = await fetch("/api/settings/knowledge-base", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ knowledgeBase }),
        })
        if (!kbRes.ok) {
          const kbData = await kbRes.json()
          setError(kbData.error || "Error al guardar base de conocimiento")
          return
        }
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  const openDays = Object.entries(hours).filter(([, v]) => v).map(([k]) => k)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight">
            Reservas<span className="text-primary">AI</span>
          </span>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step > s.number
                      ? "bg-primary text-primary-foreground"
                      : step === s.number
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <s.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${
                  step >= s.number ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 mb-5 transition-colors ${
                    step > s.number ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="text-center px-8 pt-8 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {step === 1 && "Datos del restaurante"}
              {step === 2 && "Horarios de atencion"}
              {step === 3 && "WhatsApp Bot"}
              {step === 4 && "Base de conocimiento"}
              {step === 5 && "Todo listo!"}
            </CardTitle>
            <CardDescription className="mt-1">
              {step === 1 && "Contanos sobre tu restaurante para empezar."}
              {step === 2 && "Configura los dias y horarios de atencion."}
              {step === 3 && "Conecta tu bot de WhatsApp Business."}
              {step === 4 && "Agrega informacion para que el bot responda mejor."}
              {step === 5 && "Revisa la configuracion antes de continuar."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Nombre del restaurante</Label>
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Ej: La Trattoria"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacidad maxima del restaurante</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximo de personas por reserva</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxPartySize}
                    onChange={(e) => setMaxPartySize(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  className="w-full h-11 text-sm font-medium"
                  onClick={() => setStep(2)}
                  disabled={!ready || !restaurantName.trim() || Number(maxCapacity) < 1 || Number(maxPartySize) < 1}
                >
                  {ready ? "Siguiente" : "Cargando..."}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {DAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!hours[day.key]}
                        onChange={() => toggleDay(day.key)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{day.label}</span>
                    </label>
                    {hours[day.key] ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={hours[day.key]!.open}
                          onChange={(e) => updateHour(day.key, "open", e.target.value)}
                          className="w-auto h-10"
                        />
                        <span className="text-muted-foreground text-sm">a</span>
                        <Input
                          type="time"
                          value={hours[day.key]!.close}
                          onChange={(e) => updateHour(day.key, "close", e.target.value)}
                          className="w-auto h-10"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                    Atras
                  </Button>
                  <Button className="flex-1 h-11" onClick={() => setStep(3)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <StepWhatsApp
                whatsappPhoneId={whatsappPhoneId}
                whatsappToken={whatsappToken}
                openaiApiKey={openaiApiKey}
                onChange={handleWhatsAppChange}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
                onSkip={() => setStep(4)}
              />
            )}

            {step === 4 && (
              <StepKnowledge
                knowledgeBase={knowledgeBase}
                restaurantName={restaurantName}
                onChange={setKnowledgeBase}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
                onSkip={() => setStep(5)}
              />
            )}

            {step === 5 && (
              <StepConfirmation
                restaurantName={restaurantName}
                slug={slug}
                timezone={timezone}
                maxCapacity={maxCapacity}
                maxPartySize={maxPartySize}
                openDays={openDays.map((k) => DAYS.find((d) => d.key === k)?.label ?? k)}
                hasWhatsApp={!!(whatsappPhoneId.trim() && whatsappToken.trim())}
                hasKnowledgeBase={!!knowledgeBase.trim()}
                onFinish={handleFinish}
                onBack={() => setStep(4)}
                loading={loading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
