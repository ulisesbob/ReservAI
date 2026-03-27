"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface StepKnowledgeProps {
  knowledgeBase: string
  restaurantName: string
  onChange: (value: string) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function StepKnowledge({ knowledgeBase, restaurantName, onChange, onNext, onBack, onSkip }: StepKnowledgeProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Personaliza tu bot</p>
        <p>Escribi informacion sobre tu restaurante que el bot pueda usar para responder consultas de los clientes.</p>
      </div>
      <div className="space-y-2">
        <Label>Base de conocimiento</Label>
        <textarea
          value={knowledgeBase}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Somos ${restaurantName}, un restaurante ubicado en [direccion].\n\nNuestra especialidad es [tipo de cocina].\n\nPlatos destacados:\n- [Plato 1]\n- [Plato 2]\n\nEstacionamiento: [Si/No]\nReservas minimas: [N] personas\nEventos privados: [Si/No]`}
          className="w-full min-h-[200px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">{knowledgeBase.length.toLocaleString()} / 50.000 caracteres</p>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack}>Atras</Button>
        <Button className="flex-1 h-11" onClick={onNext}>Siguiente</Button>
      </div>
      <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onSkip}>Saltear por ahora</Button>
    </div>
  )
}
