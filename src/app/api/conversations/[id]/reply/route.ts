import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { safeDecrypt } from "@/lib/encryption"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const { message } = await request.json()

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId, status: "ESCALATED" },
    })
    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada o no escalada" }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { whatsappPhoneId: true, whatsappToken: true },
    })
    if (!restaurant?.whatsappPhoneId || !restaurant?.whatsappToken) {
      return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 400 })
    }

    const savedMessage = await prisma.message.create({
      data: { conversationId: id, role: "ASSISTANT", content: message.trim() },
    })

    const decryptedToken = safeDecrypt(restaurant.whatsappToken)
    await sendWhatsAppMessage(restaurant.whatsappPhoneId, decryptedToken, conversation.customerPhone, message.trim())

    return NextResponse.json(savedMessage, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
