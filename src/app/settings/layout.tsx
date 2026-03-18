import { requireAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SettingsNav } from "./settings-nav"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireAdmin()
  } catch {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Administra tu restaurante, base de conocimiento y conexiones.
        </p>
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="md:hidden">
        <SettingsNav orientation="horizontal" />
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Desktop: sidebar */}
        <aside className="hidden md:block md:w-48 shrink-0">
          <SettingsNav orientation="vertical" />
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
