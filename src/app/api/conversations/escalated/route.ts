import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.conversationRead, request)
    if (blocked) return blocked
    const session = await requireSession()
    const conversations = await prisma.conversation.findMany({
      where: { restaurantId: session.restaurantId, status: "ESCALATED" },
      select: {
        id: true,
        customerPhone: true,
        escalatedAt: true,
        escalatedReason: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true } },
        reservation: { select: { customerName: true, dateTime: true, partySize: true } },
      },
      orderBy: { escalatedAt: "desc" },
      take: 100,
    })

    const result = conversations.map((c) => ({
      id: c.id,
      customerPhone: c.customerPhone,
      customerName: c.reservation?.customerName || null,
      lastMessage: c.messages[0]?.content || "",
      lastMessageRole: c.messages[0]?.role || null,
      escalatedAt: c.escalatedAt,
      escalatedReason: c.escalatedReason,
      reservation: c.reservation,
    }))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
