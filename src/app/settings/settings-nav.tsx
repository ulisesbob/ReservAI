"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Store, Brain, MessageCircle, Users, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/settings/restaurant", label: "Restaurante", icon: Store },
  { href: "/settings/knowledge-base", label: "Knowledge Base", icon: Brain },
  { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/settings/team", label: "Equipo", icon: Users },
  { href: "/settings/billing", label: "Facturacion", icon: CreditCard },
]

export function SettingsNav({
  orientation,
}: {
  orientation: "horizontal" | "vertical"
}) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row overflow-x-auto"
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            asChild
            className={cn(
              "justify-start gap-2",
              isActive && "bg-muted font-semibold"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
