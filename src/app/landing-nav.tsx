"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Reserva<span className="text-primary">Ya</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-sm">
            <Link href="/login">Iniciar Sesion</Link>
          </Button>
          <Button asChild size="sm" className="text-sm rounded-full px-5">
            <Link href="/register">Proba gratis</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
