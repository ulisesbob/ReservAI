"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * ReservasAI Logo System
 *
 * Logomark: a rounded rectangle with a speech-bubble tail at the bottom
 * (messaging). Inside: a 3x2 grid of rounded squares representing a
 * calendar, with a checkmark replacing the bottom-right cell (confirmed
 * reservation). The inner elements are knocked out (transparent), so
 * the mark works on any background color.
 *
 * Uses `currentColor` to adapt to light/dark themes.
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
  const uid = useId()
  const maskId = `rm-${uid}`
  const s = sizes[size].mark

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          {/* Full area visible */}
          <rect width="64" height="72" fill="white" />

          {/* Row 1: three calendar cells knocked out */}
          <rect x="12" y="14" width="9" height="9" rx="2" fill="black" />
          <rect x="27.5" y="14" width="9" height="9" rx="2" fill="black" />
          <rect x="43" y="14" width="9" height="9" rx="2" fill="black" />

          {/* Row 2: two calendar cells + checkmark */}
          <rect x="12" y="32" width="9" height="9" rx="2" fill="black" />
          <rect x="27.5" y="32" width="9" height="9" rx="2" fill="black" />

          {/* Checkmark in the bottom-right position */}
          <path
            d="M43.5 37.5l3.5 3.5 6-6.5"
            stroke="black"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* Rounded rect body + speech bubble tail */}
      <path
        d="M4 14C4 6.268 10.268 0 18 0h28c7.732 0 14 6.268 14 14v34c0 7.732-6.268 14-14 14H38l-3.8 8.2a2.5 2.5 0 0 1-4.4 0L26 62H18C10.268 62 4 55.732 4 48V14Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
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
      Reservas<span>AI</span>
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
