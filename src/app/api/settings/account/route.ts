import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireSession()
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const updateData: { name?: string; password?: string } = {}

    // Update name
    if (name && typeof name === "string" && name.trim().length > 0) {
      if (name.length > 100) {
        return NextResponse.json({ error: "Nombre demasiado largo" }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    // Update password (requires current password)
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Se requiere la contraseña actual para cambiarla" },
          { status: 400 }
        )
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 8 caracteres" },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
      }

      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Account update error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
