# Semana 5 — Polish + Launch: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Production-harden ReservasAI with Upstash Redis rate limiting, Zod validation on remaining endpoints, E2E tests with Playwright, and deploy final with monitoring.

**Architecture:** Replace in-memory rate limiter with Upstash Redis for production. Add Zod schemas to register and settings endpoints. Write Playwright E2E tests for critical flows. Final deploy verification.

**Tech Stack:** @upstash/ratelimit, @upstash/redis, Zod, Playwright

**Project root:** `C:/Users/Ulise/Desktop/z/saas para reserva de clientes/`

---

## Task 1: Install Upstash Redis Dependencies

- [ ] **Step 1: Install**
```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npm install @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json && git commit -m "chore: add @upstash/redis and @upstash/ratelimit"
```

---

## Task 2: Replace In-Memory Rate Limiter with Upstash Redis

**Files:**
- Modify: `src/lib/rate-limit.ts`

Replace the entire file. Keep the same exported API (`checkRateLimit`, `applyRateLimit`, `rateLimiters`, `getClientIp`) so all existing consumers work unchanged. Use Upstash Redis when `UPSTASH_REDIS_REST_URL` is set, fall back to in-memory when not (for local dev).

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ─── Types (unchanged API) ────────────────────────────────────────────────

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

// ─── Upstash Redis client (singleton) ─────────────────────────────────────

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// ─── Upstash rate limiters cache ──────────────────────────────────────────

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

// ─── In-memory fallback (for local dev without Redis) ─────────────────────

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

// ─── Public API (same interface as before) ────────────────────────────────

export async function checkRateLimit(
  config: RateLimitConfig,
  key: string
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config)
  if (upstash) {
    const result = await upstash.limit(key)
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    }
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
} as const

export async function applyRateLimit(
  config: RateLimitConfig,
  request: Request
): Promise<Response | null> {
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
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}
```

**IMPORTANT:** The function signatures changed from sync to async (`checkRateLimit` and `applyRateLimit` now return Promises). All callers that use `applyRateLimit` need to be updated to `await` the result. Search for all usages of `applyRateLimit` in the codebase and add `await` if missing. The pattern is:
```typescript
// Before: const blocked = applyRateLimit(...)
// After:  const blocked = await applyRateLimit(...)
```

Commit:
```bash
git add -A && git commit -m "feat: replace in-memory rate limiter with Upstash Redis (with fallback)"
```

---

## Task 3: Add Zod Validation to Register Endpoint

**Files:**
- Modify: `src/app/api/register/route.ts`

Replace the manual validation with Zod schema. Import `registerSchema` and `parseBody` from `@/lib/schemas`. The schema already exists in schemas.ts.

Replace the manual validation block (everything from `if (!restaurantName || !name...)` through the email regex check and length checks) with:

```typescript
    const body = await request.json()
    const parsed = parseBody(registerSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { restaurantName, name, email, password, timezone } = parsed.data
```

Keep the rest of the function (password validation, existing user check, slug generation, etc.) as-is.

Also add `await` to the `applyRateLimit` call if using the old sync pattern (replace manual rate limit check with `const blocked = await applyRateLimit(rateLimiters.register, request); if (blocked) return blocked;`).

Commit:
```bash
git add src/app/api/register/route.ts && git commit -m "feat: add Zod validation to register endpoint"
```

---

## Task 4: Add Zod Validation to Settings Endpoints

**Files:**
- Modify: `src/app/api/settings/restaurant/route.ts`
- Modify: `src/app/api/settings/account/route.ts`

### Restaurant settings PATCH:
Replace manual validation with `restaurantSettingsSchema` from `@/lib/schemas`:
```typescript
import { restaurantSettingsSchema, parseBody } from "@/lib/schemas"
// ...
const parsed = parseBody(restaurantSettingsSchema, body)
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
const { name, timezone, maxCapacity, maxPartySize, operatingHours } = parsed.data
```
Keep the `maxPartySize > maxCapacity` check and the prisma update.

### Account PATCH:
Replace manual validation with `accountUpdateSchema` from `@/lib/schemas`:
```typescript
import { accountUpdateSchema, parseBody } from "@/lib/schemas"
// ...
const parsed = parseBody(accountUpdateSchema, body)
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
const { name, currentPassword, newPassword } = parsed.data
```

Also update any `applyRateLimit` calls to use `await`.

Commit:
```bash
git add src/app/api/settings/ && git commit -m "feat: add Zod validation to settings endpoints"
```

---

## Task 5: Fix All applyRateLimit Callers to Async

Search the entire codebase for `applyRateLimit` calls. Every one needs `await`. Files to check:
- `src/app/api/reservations/route.ts`
- `src/app/api/reservations/[id]/route.ts`
- `src/app/api/book/[slug]/route.ts`
- `src/app/api/settings/restaurant/route.ts`
- `src/app/api/settings/account/route.ts`
- `src/app/api/agent/test/route.ts`
- Any other file using `applyRateLimit`

Pattern: find `const blocked = applyRateLimit(` and change to `const blocked = await applyRateLimit(`

Commit:
```bash
git add -A && git commit -m "fix: await async applyRateLimit in all API routes"
```

---

## Task 6: Install Playwright and Create E2E Tests

- [ ] **Step 1: Install Playwright**
```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create playwright.config.ts**

```typescript
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: Create E2E tests for critical flows**

Create `e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading")).toContainText("Iniciar sesión")
  })

  test("register page loads", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("heading")).toContainText("Crear cuenta")
  })

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "invalid@test.com")
    await page.fill('input[type="password"]', "wrongpassword")
    await page.click('button[type="submit"]')
    await expect(page.locator("text=Error")).toBeVisible({ timeout: 5000 })
  })

  test("unauthenticated user redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/login/)
  })
})
```

Create `e2e/public-booking.spec.ts`:
```typescript
import { test, expect } from "@playwright/test"

test.describe("Public Booking", () => {
  test("booking page shows restaurant not found for invalid slug", async ({ page }) => {
    await page.goto("/book/nonexistent-restaurant")
    await expect(page.locator("text=no encontr")).toBeVisible({ timeout: 5000 })
  })

  test("landing page loads", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=ReservasAI")).toBeVisible()
  })
})
```

Create `e2e/api.spec.ts`:
```typescript
import { test, expect } from "@playwright/test"

test.describe("API Health", () => {
  test("health endpoint responds", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.status()).toBe(200)
  })

  test("protected endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/reservations")
    expect(response.status()).toBe(401)
  })

  test("waitlist endpoint returns 401 for GET without auth", async ({ request }) => {
    const response = await request.get("/api/waitlist")
    expect(response.status()).toBe(401)
  })
})
```

- [ ] **Step 4: Add test script to package.json**

Add to scripts:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add Playwright E2E tests for auth, booking, and API health"
```

---

## Task 7: Build, Verify, and Deploy

- [ ] **Step 1: Run prisma generate + build**
```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes" && npx prisma generate && npm run build
```

- [ ] **Step 2: Fix any build errors**

- [ ] **Step 3: Final commit and push**
```bash
git add -A && git commit -m "feat: Semana 5 complete — Upstash Redis, Zod validation, E2E tests" && git push origin main
```
