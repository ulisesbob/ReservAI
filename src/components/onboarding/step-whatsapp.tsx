"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface StepWhatsAppProps {
  whatsappPhoneId: string
  whatsappToken: string
  openaiApiKey: string
  onChange: (field: string, value: string) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function StepWhatsApp({ whatsappPhoneId, whatsappToken, openaiApiKey, onChange, onNext, onBack, onSkip }: StepWhatsAppProps) {
  const canContinue = whatsappPhoneId.trim() && whatsappToken.trim()
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Configura tu bot de WhatsApp</p>
        <p>Necesitas una cuenta de WhatsApp Business API. Si no la tenes todavia, podes saltear este paso y configurarlo despues.</p>
      </div>
      <div className="space-y-2">
        <Label>Phone Number ID</Label>
        <Input value={whatsappPhoneId} onChange={(e) => onChange("whatsappPhoneId", e.target.value)} placeholder="Ej: 123456789012345" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label>Token de acceso</Label>
        <Input type="password" value={whatsappToken} onChange={(e) => onChange("whatsappToken", e.target.value)} placeholder="Token de Meta Business" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label>OpenAI API Key (opcional)</Label>
        <Input type="password" value={openaiApiKey} onChange={(e) => onChange("openaiApiKey", e.target.value)} placeholder="sk-..." className="h-11" />
        <p className="text-xs text-muted-foreground">Si no proporcionas una, se usara la clave por defecto del sistema.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack}>Atras</Button>
        <Button className="flex-1 h-11" onClick={onNext} disabled={!canContinue}>Siguiente</Button>
      </div>
      <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onSkip}>Saltear por ahora</Button>
    </div>
  )
}
