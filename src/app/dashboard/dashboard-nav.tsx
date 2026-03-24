"use client"

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
