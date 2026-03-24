import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nueva Contraseña | ReservasAI",
  description: "Creá una nueva contraseña para tu cuenta de ReservasAI.",
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
