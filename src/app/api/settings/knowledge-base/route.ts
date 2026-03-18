import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { knowledgeBase } = body

    if (typeof knowledgeBase !== "string") {
      return NextResponse.json(
        { error: "El contenido es obligatorio" },
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
