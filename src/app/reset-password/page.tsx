"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Ocurrió un error")
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/login"), 3000)
  }

  if (!token) {
    return (
      <Card className="rounded-xl shadow-sm border-border/50">
        <CardContent className="px-8 py-8 text-center">
          <p className="text-muted-foreground">
            Enlace inválido. <Link href="/forgot-password" className="text-emerald-600 hover:underline">Solicita uno nuevo</Link>.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm border-border/50">
      <CardHeader className="text-center px-8 pt-8 pb-2">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {success ? "Contraseña actualizada" : "Nueva contraseña"}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {success
            ? "Tu contraseña fue actualizada. Redirigiendo al login..."
            : "Ingresa tu nueva contraseña."}
        </p>
      </CardHeader>

      <CardContent className="px-8 pb-4">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="justify-center px-8 pb-8">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight">
            Reservas<span className="text-emerald-500">AI</span>
          </span>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
