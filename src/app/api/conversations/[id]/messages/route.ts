import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await applyRateLimit(rateLimiters.conversationRead, request)
    if (blocked) return blocked
    const session = await requireSession()
    const { id } = await params
    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })
    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({
      conversation: {
        id: conversation.id, customerPhone: conversation.customerPhone,
        status: conversation.status, escalatedAt: conversation.escalatedAt,
        escalatedReason: conversation.escalatedReason,
      },
      messages,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
