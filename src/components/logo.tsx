"use client"

import { cn } from "@/lib/utils"

/**
 * ReservasAI Logo System
 *
 * Logomark: a rounded square in emerald (#059669) with a bold white "R"
 * lettermark — simple, geometric, works at any size from 16x16 to hero.
 *
 * Inspired by Stripe's "S", Linear's cube, Notion's "N".
 *
 * Variants:
 *  - Logo         = mark + wordmark (horizontal lockup)
 *  - LogoMark     = icon only (works at 16x16)
 *  - LogoWordmark = text only
 */

const sizes = {
  sm: { mark: 24, text: "text-base", gap: "gap-1.5" },
  md: { mark: 32, text: "text-xl", gap: "gap-2" },
  lg: { mark: 40, text: "text-2xl", gap: "gap-2.5" },
} as const

type Size = keyof typeof sizes

interface LogoProps {
  className?: string
  size?: Size
}

/* ------------------------------------------------------------------ */
/*  LogoMark — standalone icon                                        */
/* ------------------------------------------------------------------ */

export function LogoMark({ className, size = "md" }: LogoProps) {
  const s = sizes[size].mark

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Rounded square background */}
      <rect width="48" height="48" rx="12" fill="#059669" />

      {/* Bold geometric "R" */}
      <path
        d="M15 38V10h11.5c2.8 0 5 .7 6.5 2.2 1.6 1.4 2.4 3.4 2.4 5.8 0 1.8-.5 3.3-1.4 4.5-.9 1.2-2.2 2-3.8 2.5L35 38h-6.2l-4.3-12h-3.2v12H15zm6.3-17.5h4.8c1.4 0 2.4-.4 3.2-1.1.7-.7 1.1-1.7 1.1-2.9 0-1.2-.4-2.1-1.1-2.8-.8-.7-1.8-1-3.2-1h-4.8v7.8z"
        fill="white"
      />

      {/* Small checkmark accent — bottom right */}
      <path
        d="M33 35l2.5 2.5L39 34"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  LogoWordmark — text only                                          */
/* ------------------------------------------------------------------ */

export function LogoWordmark({ className, size = "md" }: LogoProps) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight select-none",
        sizes[size].text,
        className,
      )}
    >
      Reservas<span className="text-emerald-600 font-extrabold">AI</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Logo — full horizontal lockup (mark + wordmark)                   */
/* ------------------------------------------------------------------ */

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        sizes[size].gap,
        className,
      )}
    >
      <LogoMark size={size} />
      <LogoWordmark size={size} />
    </span>
  )
}
