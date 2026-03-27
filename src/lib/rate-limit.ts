/**
 * Simple in-memory rate limiter for serverless environments.
 * NOTE: On Vercel serverless, each cold start gets a fresh Map,
 * so this provides best-effort protection. For production hardening,
 * replace with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

interface RateLimitConfig {
  /** Unique name for this limiter (e.g. "login", "register") */
  name: string
  /** Max requests allowed within the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  config: RateLimitConfig,
  key: string
): RateLimitResult {
  const store = getStore(config.name)
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

/** Pre-configured limiters */
export const rateLimiters = {
  login: { name: "login", maxRequests: 5, windowMs: 15 * 60 * 1000 },                  // 5 per 15 min
  register: { name: "register", maxRequests: 3, windowMs: 60 * 60 * 1000 },            // 3 per hour
  agentTest: { name: "agentTest", maxRequests: 10, windowMs: 60 * 1000 },              // 10 per min
  reservationWrite: { name: "reservationWrite", maxRequests: 30, windowMs: 60 * 1000 }, // 30 per min
  reservationRead: { name: "reservationRead", maxRequests: 60, windowMs: 60 * 1000 },  // 60 per min
  settings: { name: "settings", maxRequests: 20, windowMs: 60 * 1000 },                // 20 per min
  export: { name: "export", maxRequests: 5, windowMs: 60 * 1000 },                     // 5 per min
} as const

/**
 * Check rate limit and return a 429 response if exceeded, or null if allowed.
 * Usage: const blocked = applyRateLimit(rateLimiters.settings, request); if (blocked) return blocked;
 */
export function applyRateLimit(
  config: RateLimitConfig,
  request: Request
): Response | null {
  const ip = getClientIp(request)
  const rl = checkRateLimit(config, ip)
  if (!rl.allowed) {
    return Response.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }
  return null
}

/**
 * Extract client IP from request headers (works with Vercel/Cloudflare).
 */
export function getClientIp(request: Request): string {
  const headers = request.headers
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}
