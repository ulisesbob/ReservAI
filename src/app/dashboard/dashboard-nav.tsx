"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

export function DashboardNav({ name, role }: { name: string; role: string }) {
  const [escalatedCount, setEscalatedCount] = useState(0)
  const [waitlistCount, setWaitlistCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [escRes, waitRes] = await Promise.all([
          fetch("/api/conversations/escalated"),
          fetch("/api/waitlist?status=WAITING"),
        ])
        if (escRes.ok) {
          const data = await escRes.json()
          setEscalatedCount(Array.isArray(data) ? data.length : 0)
        }
        if (waitRes.ok) {
          const data = await waitRes.json()
          setWaitlistCount(Array.isArray(data) ? data.length : 0)
        }
      } catch { /* ignore */ }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 10000)
    return () => clearInterval(interval)
  }, [])
  return (
    <nav className="border-b bg-background" aria-label="Navegación principal">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">
              Reservas<span className="text-primary">AI</span>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Reservas</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/analytics">Analytics</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/customers">Clientes</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/waitlist" className="relative">
                  Lista de espera
                  {waitlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {waitlistCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/chats" className="relative">
                  Chats
                  {escalatedCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {escalatedCount}
                    </span>
                  )}
                </Link>
              </Button>
              {role === "ADMIN" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/restaurant">Configuracion</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
              {role}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {role === "ADMIN" ? "Administrador" : "Empleado"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/account">Mi cuenta</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
