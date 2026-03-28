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
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  ContactRound,
  Star,
  BarChart3,
  MoreHorizontal,
  Users,
  Clock,
  MessageSquare,
  UserX,
  FileText,
  Settings,
  CalendarDays,
} from "lucide-react"

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

  const totalBadgeCount = escalatedCount + waitlistCount

  const secondaryItems = [
    {
      href: "/dashboard/customers",
      label: "Clientes",
      icon: Users,
    },
    {
      href: "/dashboard/waitlist",
      label: "Lista de espera",
      icon: Clock,
      badge: waitlistCount,
      badgeColor: "bg-orange-500",
    },
    {
      href: "/dashboard/chats",
      label: "Chats",
      icon: MessageSquare,
      badge: escalatedCount,
      badgeColor: "bg-red-500",
    },
    {
      href: "/dashboard/no-shows",
      label: "No-shows",
      icon: UserX,
    },
    {
      href: "/dashboard/reviews",
      label: "Reseñas",
      icon: Star,
    },
    {
      href: "/dashboard/reports",
      label: "Reportes",
      icon: FileText,
    },
  ]

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
              {/* Primary nav — always visible */}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Reservas
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/dashboard/analytics" className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/dashboard/guests" className="flex items-center gap-1.5">
                  <ContactRound className="h-3.5 w-3.5" />
                  CRM
                </Link>
              </Button>
              {role === "ADMIN" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/restaurant" className="flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Configuración</span>
                    <span className="sm:hidden">Config</span>
                  </Link>
                </Button>
              )}

              {/* "Más" dropdown — secondary items */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    Más
                    {totalBadgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {totalBadgeCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {/* On mobile, also show Analytics and CRM here */}
                  <DropdownMenuItem asChild className="cursor-pointer sm:hidden">
                    <Link href="/dashboard/analytics" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer sm:hidden">
                    <Link href="/dashboard/guests" className="flex items-center gap-2">
                      <ContactRound className="h-4 w-4" />
                      CRM
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="sm:hidden" />
                  {secondaryItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {item.badge && item.badge > 0 ? (
                          <span className={`ml-auto ${item.badgeColor} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale="es" />
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
