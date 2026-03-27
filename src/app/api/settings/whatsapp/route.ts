import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { whatsappSettingsSchema, parseBody } from "@/lib/schemas"

export async function PATCH(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.settings, request)
    if (blocked) return blocked
    const session = await requireAdmin()

    const body = await request.json()
    const parsed = parseBody(whatsappSettingsSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { whatsappPhoneId, whatsappToken, openaiApiKey } = parsed.data

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
