import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

interface RateLimitConfig {
  name: string
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

const upstashLimiters = new Map<string, Ratelimit>()
function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  let limiter = upstashLimiters.get(config.name)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
      prefix: `rl:${config.name}`,
    })
    upstashLimiters.set(config.name, limiter)
  }
  return limiter
}

interface InMemoryEntry { count: number; resetAt: number }
const inMemoryStores = new Map<string, Map<string, InMemoryEntry>>()
function checkInMemory(config: RateLimitConfig, key: string): RateLimitResult {
  let store = inMemoryStores.get(config.name)
  if (!store) { store = new Map(); inMemoryStores.set(config.name, store) }
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

export async function checkRateLimit(config: RateLimitConfig, key: string): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config)
  if (upstash) {
    const result = await upstash.limit(key)
    return { allowed: result.success, remaining: result.remaining, resetAt: result.reset }
  }
  return checkInMemory(config, key)
}

export const rateLimiters = {
  login: { name: "login", maxRequests: 5, windowMs: 15 * 60 * 1000 },
  register: { name: "register", maxRequests: 3, windowMs: 60 * 60 * 1000 },
  agentTest: { name: "agentTest", maxRequests: 10, windowMs: 60 * 1000 },
  reservationWrite: { name: "reservationWrite", maxRequests: 30, windowMs: 60 * 1000 },
  reservationRead: { name: "reservationRead", maxRequests: 60, windowMs: 60 * 1000 },
  settings: { name: "settings", maxRequests: 20, windowMs: 60 * 1000 },
  export: { name: "export", maxRequests: 5, windowMs: 60 * 1000 },
  billing: { name: "billing", maxRequests: 5, windowMs: 60 * 1000 },
  guestWrite: { name: "guestWrite", maxRequests: 30, windowMs: 60 * 1000 },
  guestRead: { name: "guestRead", maxRequests: 60, windowMs: 60 * 1000 },
  reviewWrite: { name: "reviewWrite", maxRequests: 20, windowMs: 60 * 1000 },
  reviewRead: { name: "reviewRead", maxRequests: 60, windowMs: 60 * 1000 },
  conversationRead: { name: "conversationRead", maxRequests: 60, windowMs: 60 * 1000 },
  conversationWrite: { name: "conversationWrite", maxRequests: 30, windowMs: 60 * 1000 },
  analytics: { name: "analytics", maxRequests: 30, windowMs: 60 * 1000 },
  locale: { name: "locale", maxRequests: 10, windowMs: 60 * 1000 },
  health: { name: "health", maxRequests: 30, windowMs: 60 * 1000 },
} as const

export async function applyRateLimit(config: RateLimitConfig, request: Request): Promise<Response | null> {
  const ip = getClientIp(request)
  const rl = await checkRateLimit(config, ip)
  if (!rl.allowed) {
    return Response.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }
  return null
}

export function getClientIp(request: Request): string {
  const headers = request.headers
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}
