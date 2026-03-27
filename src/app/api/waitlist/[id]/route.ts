import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, restaurantId: session.restaurantId },
    })
    if (!entry) {
      return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 })
    }

    await prisma.waitlistEntry.update({ where: { id }, data: { status: "CANCELLED" } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
