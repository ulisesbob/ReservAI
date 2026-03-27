"use client"

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  metadata?: {
    reservationId?: string
    waitlistEntryId?: string
  } | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 30_000

/** Returns the dashboard link most relevant to a notification type. */
function linkForNotification(n: Notification): string {
  switch (n.type) {
    case "RESERVATION_NEW":
    case "RESERVATION_CANCEL":
    case "DEPOSIT_PAID":
      return n.metadata?.reservationId
        ? `/dashboard?highlight=${n.metadata.reservationId}`
        : "/dashboard"
    case "NO_SHOW":
      return "/dashboard/no-shows"
    case "WAITLIST_FREED":
      return "/dashboard/waitlist"
    default:
      return "/dashboard"
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function notificationIcon(type: string): string {
  switch (type) {
    case "RESERVATION_NEW":
      return "+"
    case "RESERVATION_CANCEL":
      return "x"
    case "NO_SHOW":
      return "!"
    case "WAITLIST_FREED":
      return "~"
    case "DEPOSIT_PAID":
      return "$"
    default:
      return "•"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications?limit=10&filter=all")
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } catch {
      // silently ignore — network errors should not crash the nav
    }
  }

  // Start polling
  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // When dropdown opens, mark visible unread notifications as read
  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        })
        setUnreadCount(0)
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      } catch {
        // ignore
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // ignore
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} notificaciones sin leer`
              : "Notificaciones"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[420px] overflow-y-auto"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Marcar todas como leidas
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Sin notificaciones recientes
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="cursor-pointer px-0 py-0">
              <Link
                href={linkForNotification(n)}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 w-full"
              >
                {/* Icon dot */}
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    n.read
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {notificationIcon(n.type)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-snug ${
                      n.read ? "text-muted-foreground" : "font-medium text-foreground"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                    {n.message}
                  </p>
                </div>

                {/* Time */}
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                </span>

                {/* Unread indicator */}
                {!n.read && (
                  <Badge className="h-1.5 w-1.5 shrink-0 rounded-full p-0 bg-red-500 self-center" />
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />

        {/* Footer: view all */}
        <DropdownMenuItem asChild className="cursor-pointer justify-center">
          <Link
            href="/dashboard"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1.5"
          >
            Ver panel completo
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
