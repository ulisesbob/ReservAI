import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function PATCH(request: Request) {
  try {
    const blocked = applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const body = await request.json()
    const { knowledgeBase } = body

    if (typeof knowledgeBase !== "string") {
      return NextResponse.json(
        { error: "El contenido es obligatorio" },
        { status: 400 }
      )
    }

    // Limit to 50KB — this text gets injected into every AI prompt
    if (knowledgeBase.length > 50000) {
      return NextResponse.json(
        { error: "El contenido es demasiado largo (máximo 50.000 caracteres)" },
        { status: 400 }
      )
    }

    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: { knowledgeBase },
    })

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
