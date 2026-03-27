import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const conversation = await prisma.conversation.findFirst({
      where: { id, restaurantId: session.restaurantId, status: "ESCALATED" },
    })
    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada o no escalada" }, { status: 404 })
    }
    await prisma.conversation.update({ where: { id }, data: { status: "COMPLETED" } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
