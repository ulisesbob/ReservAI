"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "FAQ" },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        closeMenu()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen, closeMenu])

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [menuOpen, closeMenu])

  return (
    <nav
      aria-label="Principal"
      className={`fixed top-0 left-0 right-0 z-50 transition-all motion-reduce:transition-none duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent"
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Saltar al contenido principal
      </a>
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Reservas<span className="text-foreground">AI</span>
        </Link>

        {/* Section anchors */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            ref={buttonRef}
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
            Iniciar sesion
          </Link>
          <Button asChild size="sm" className="text-sm rounded-lg px-5 bg-foreground text-background hover:bg-foreground/90">
            <Link href="/register">Proba gratis</Link>
          </Button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-nav-menu"
          className="md:hidden border-b bg-background/95 backdrop-blur-xl"
        >
          <div className="flex flex-col px-6 py-4 gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors py-1 sm:hidden"
              onClick={closeMenu}
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
