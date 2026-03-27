import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()
    const { id } = await params

    // Prevent deleting yourself
    if (id === session.userId) {
      return NextResponse.json(
        { error: "No podes eliminar tu propia cuenta" },
        { status: 400 }
      )
    }

    // Find the user and verify they belong to this restaurant
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, restaurantId: true, role: true },
    })

    if (!user || user.restaurantId !== session.restaurantId) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Prevent deleting other admins
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "No se puede eliminar a otro administrador" },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 })
      }
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
