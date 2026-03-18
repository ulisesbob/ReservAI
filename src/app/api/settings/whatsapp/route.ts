import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { whatsappPhoneId, whatsappToken } = body

    if (typeof whatsappPhoneId !== "string" || typeof whatsappToken !== "string") {
      return NextResponse.json(
        { error: "Datos invalidos" },
        { status: 400 }
      )
    }

    // Build update data — only update token if a new value was provided
    const updateData: { whatsappPhoneId: string | null; whatsappToken?: string | null } = {
      whatsappPhoneId: whatsappPhoneId || null,
    }

    if (whatsappToken) {
      // Encrypt whatsappToken before saving to DB
      updateData.whatsappToken = encrypt(whatsappToken)
    }

    await prisma.restaurant.update({
      where: { id: session.restaurantId },
      data: updateData,
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
