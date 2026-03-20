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

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email o contrasena incorrectos")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/20" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              Reserva<span className="text-primary">Ya</span>
            </span>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Gestiona las reservas<br />
              de tu restaurante<br />
              sin esfuerzo.
            </h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Reservas por WhatsApp</p>
                  <p className="text-sm text-background/60">Tus clientes reservan desde su app favorita con IA.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Panel en tiempo real</p>
                  <p className="text-sm text-background/60">Ve y gestiona todas tus reservas en un solo lugar.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Equipo conectado</p>
                  <p className="text-sm text-background/60">Invita a tu equipo y gestionen juntos.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-background/40">
            ReservaYa &mdash; La forma inteligente de recibir reservas.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <span className="text-2xl font-bold tracking-tight">
              Reserva<span className="text-primary">Ya</span>
            </span>
          </div>

          <Card className="rounded-xl shadow-sm border-border/50">
            <CardHeader className="text-center px-8 pt-8 pb-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">Iniciar Sesion</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa a tu cuenta para gestionar reservas
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
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
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center px-8 pb-8">
              <p className="text-sm text-muted-foreground">
                No tenes cuenta?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Registrate
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
