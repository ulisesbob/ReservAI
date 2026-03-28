"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CalendarDays, MessageCircle, Users } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      restaurantName: formData.get("restaurantName") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Error al registrar")
        setLoading(false)
        return
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Registro exitoso pero error al iniciar sesion. Intenta ingresar manualmente.")
        setLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Error de conexion")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark text-white relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              Reservas<span className="text-emerald-400">AI</span>
            </span>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Tu restaurante<br />
              merece un sistema<br />
              de reservas moderno.
            </h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Reservas por WhatsApp</p>
                  <p className="text-sm text-white/60">Un agente de IA atiende a tus clientes 24/7.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Cero overbooking</p>
                  <p className="text-sm text-white/60">Validacion automatica de disponibilidad y capacidad.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Listo en 5 minutos</p>
                  <p className="text-sm text-white/60">Registrate, configura horarios, y empeza a recibir reservas.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/40">
            ReservasAI &mdash; La forma inteligente de recibir reservas.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <span className="text-2xl font-bold tracking-tight">
              Reservas<span className="text-emerald-500">AI</span>
            </span>
          </div>

          <Card className="rounded-xl shadow-sm border-border/50">
            <CardHeader className="text-center px-8 pt-8 pb-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">Registrar Restaurante</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tu cuenta y empeza a recibir reservas
              </p>
            </CardHeader>

            <CardContent className="px-8 pb-4">
              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                  <Input
                    id="restaurantName"
                    name="restaurantName"
                    type="text"
                    placeholder="Mi Restaurante"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Tu Nombre</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Juan Perez"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contrasena</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? "Registrando..." : "Registrar"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center px-8 pb-8">
              <p className="text-sm text-muted-foreground">
                Ya tenes cuenta?{" "}
                <Link href="/login" className="text-emerald-600 hover:underline font-medium">
                  Inicia sesion
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
