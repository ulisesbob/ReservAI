"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") }),
    })

    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight">
            Reservas<span className="text-emerald-500">AI</span>
          </span>
        </div>

        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="text-center px-8 pt-8 pb-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {sent ? "Revisa tu email" : "Recuperar contraseña"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {sent
                ? "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña."
                : "Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña."}
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-4">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  El enlace expira en 1 hora. Revisa tu bandeja de spam si no lo ves.
                </p>
              </div>
            ) : (
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
                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar enlace"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center px-8 pb-8">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
