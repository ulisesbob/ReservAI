import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { markAllAsRead, markAsRead } from "@/lib/notifications"

/**
 * GET /api/notifications
 *
 * Returns a paginated list of notifications for the authenticated restaurant.
 *
 * Query params:
 *   - page     (default 1)
 *   - limit    (default 20, max 50)
 *   - filter   "unread" | "read" | "all" (default "all")
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const filter = searchParams.get("filter") || "all"

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (filter === "unread") where.read = false
    if (filter === "read") where.read = true

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          read: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { restaurantId: session.restaurantId, read: false },
      }),
    ])

    return NextResponse.json({
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications
 *
 * Marks notifications as read.
 *
 * Body options:
 *   - { all: true }                      → marks all as read
 *   - { id: "<notificationId>" }         → marks a single notification as read
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()

    if (body?.all === true) {
      const count = await markAllAsRead(session.restaurantId)
      return NextResponse.json({ success: true, updated: count })
    }

    if (typeof body?.id === "string" && body.id.length > 0) {
      const success = await markAsRead(body.id, session.restaurantId)
      if (!success) {
        return NextResponse.json({ error: "Notificacion no encontrada" }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Proporciona id o all: true" },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
