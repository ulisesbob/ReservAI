import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const blocked = await applyRateLimit(rateLimiters.health, request)
  if (blocked) return blocked

  const checks: Record<string, "ok" | "error"> = {}

  // Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = "ok"
  } catch {
    checks.database = "error"
  }

  // Environment variables — check presence without exposing names
  const envOk = ["DATABASE_URL", "NEXTAUTH_SECRET", "ENCRYPTION_KEY"].every(
    (v) => !!process.env[v]
  )

  const allOk = checks.database === "ok" && envOk

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    }
  )
}
