import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { whatsappPhoneId, whatsappToken, openaiApiKey } = body

    if (typeof whatsappPhoneId !== "string" || typeof whatsappToken !== "string") {
      return NextResponse.json(
        { error: "Datos invalidos" },
        { status: 400 }
      )
    }

    // Build update data — only update tokens if new values were provided
    const updateData: { whatsappPhoneId: string | null; whatsappToken?: string | null; openaiApiKey?: string | null } = {
      whatsappPhoneId: whatsappPhoneId || null,
    }

    if (whatsappToken) {
      updateData.whatsappToken = encrypt(whatsappToken)
    }

    if (typeof openaiApiKey === "string") {
      updateData.openaiApiKey = openaiApiKey ? encrypt(openaiApiKey) : null
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
