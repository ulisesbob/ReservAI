import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Iniciar Sesión | ReservasAI",
  description: "Ingresá a tu cuenta de ReservasAI para gestionar las reservas de tu restaurante.",
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
