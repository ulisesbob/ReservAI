import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Recuperar Contraseña | ReservasAI",
  description: "Restablecé tu contraseña de ReservasAI.",
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
