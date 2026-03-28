import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. See .env.example for format."
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Cache the singleton in ALL environments (including production on Vercel serverless).
// Without this, each cold start creates a new PrismaClient + connection pool.
// The previous condition `!== "production"` meant production cold starts always
// created fresh clients, wasting ~50-100ms per invocation on connection setup.
globalForPrisma.prisma = prisma
