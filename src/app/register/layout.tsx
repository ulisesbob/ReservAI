import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Crear Cuenta | ReservasAI",
  description: "Registrá tu restaurante en ReservasAI y empezá a recibir reservas por WhatsApp con IA. 14 días gratis.",
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
