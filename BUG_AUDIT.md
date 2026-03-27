# ReservasAI -- Bug Audit Report

**Date:** 2026-03-26
**Scope:** Full API routes, middleware, auth, Prisma schema, billing/pricing logic
**Files audited:** 21 route files, middleware.ts, auth.ts, auth.config.ts, lib/auth.ts, schema.prisma, pricing-section.tsx, pricing-toggle.tsx, lib/rate-limit.ts, lib/validation.ts, lib/encryption.ts, lib/mercadopago.ts, lib/env.ts, lib/prisma.ts, lib/reset-token.ts, instrumentation.ts

---

## CRITICAL -- Security / Data Leakage

### C01. Middleware excludes ALL API routes from auth protection

**File:** `src/middleware.ts` line 9
**Issue:** The matcher pattern `/((?!api|_next/static|_next/image|favicon.ico).*)` explicitly excludes every path starting with `/api` from middleware auth checks. This means ALL API endpoints rely solely on their own `requireSession()`/`requireAdmin()` calls. If any developer forgets to add the auth check inside a new route, it will be fully public. This is a defense-in-depth gap -- the middleware should protect `/api` routes too, with explicit exceptions only for public endpoints like `/api/auth`, `/api/register`, `/api/health`, `/api/webhooks`, and `/api/whatsapp/webhook`.

**Severity:** CRITICAL
**Impact:** Any future API route added without explicit auth check will be completely unprotected.

---

### C02. Customers route: `requireAdmin()` throws "Forbidden" but catch block only handles "Unauthorized"

**File:** `src/app/api/customers/route.ts` lines 92-98
**Issue:** The route calls `requireAdmin()`, which can throw either `"Unauthorized"` (from `requireSession`) or `"Forbidden"` (from `requireAdmin`). The catch block only handles `error.message === "Unauthorized"` and falls through to a generic 500 for "Forbidden". This means an authenticated EMPLOYEE trying to access customers gets a 500 Internal Server Error instead of a 403 Forbidden.

**Severity:** CRITICAL (information disclosure -- 500 errors may leak stack traces in dev mode, and it is a broken access control response)

---

### C03. Reservation POST does not check `maxPartySize` or `maxCapacity`

**File:** `src/app/api/reservations/route.ts` lines 78-150
**Issue:** When manually creating a reservation, the endpoint validates that `partySize >= 1` but never checks against the restaurant's `maxPartySize` or `maxCapacity`. A user can create a reservation for 999 guests, which the WhatsApp AI agent correctly checks via `checkAvailability()` but the manual create path completely bypasses.

**Severity:** CRITICAL (business logic bypass -- defeats capacity controls)

---

### C04. Reservation PATCH does not check `maxPartySize` / `maxCapacity` either

**File:** `src/app/api/reservations/[id]/route.ts` lines 34-39
**Issue:** When updating a reservation's `partySize`, only `>= 1` is validated. No check against restaurant limits. An attacker or careless user could update an existing reservation to an arbitrarily large party size.

**Severity:** CRITICAL (business logic bypass)

---

### C05. Reservation PATCH does not validate `dateTime` is not in the past

**File:** `src/app/api/reservations/[id]/route.ts` line 33
**Issue:** When updating `dateTime`, it is directly converted to a `new Date()` but there is no check that it is not in the past, unlike the POST endpoint which does check `parsedDate < new Date()`.

**Severity:** CRITICAL (data integrity -- reservations can be silently moved to past dates)

---

### C06. WhatsApp webhook verify token compared via simple `===` (no timing-safe comparison)

**File:** `src/app/api/whatsapp/webhook/route.ts` lines 36-38
**Issue:** The GET handler for Meta webhook verification compares `token === process.env.WHATSAPP_VERIFY_TOKEN` using a simple equality check. While this is only the verification handshake (not the message signature), if the verify token is a high-entropy secret, a timing side-channel could theoretically leak it character-by-character over many requests. The POST handler correctly uses HMAC + `timingSafeEqual`.

**Severity:** CRITICAL (low exploitability, but the pattern is wrong for secret comparison)

---

### C07. `openaiApiKey` stored per-restaurant in plaintext column, decrypted via `safeDecrypt` fallback

**File:** `src/lib/encryption.ts` lines 48-62, `src/app/api/whatsapp/webhook/route.ts` line 208-210
**Issue:** `safeDecrypt()` silently falls back to returning the raw value if decryption fails. This means if an `openaiApiKey` was ever stored before encryption was implemented (or if ENCRYPTION_KEY is wrong), the plaintext key is still used without any warning to the user. Additionally, there is no API endpoint that encrypts the `openaiApiKey` on save -- there is only an encryption path for `whatsappToken` in the whatsapp settings route. The `openaiApiKey` may be stored unencrypted.

**Severity:** CRITICAL (secrets management -- API keys potentially stored and transmitted in plaintext)

---

## HIGH -- Broken Features / Crashes

### H01. Pricing page shows 3 tiers (Starter/Pro/Elite) but billing system only supports 2 plans (MONTHLY/YEARLY)

**Files:**
- `src/components/pricing-section.tsx` -- shows Starter ($29), Pro ($59), Elite ($99)
- `src/lib/mercadopago.ts` -- defines only `MONTHLY` (ARS 25,000) and `YEARLY` (ARS 240,000)
- `prisma/schema.prisma` -- `SubscriptionPlan` enum: `MONTHLY | YEARLY`
- `src/app/api/settings/billing/route.ts` -- only accepts `plan === "MONTHLY" || plan === "YEARLY"`

**Issue:** The pricing page presents three feature-differentiated tiers, but the entire backend only knows about two billing frequencies with a single flat price. There is zero mapping from tier to plan. A customer who clicks "Starter" or "Elite" goes to `/register` identically. After signup, the billing page only offers Monthly or Yearly -- the tier concept vanishes entirely. The prices also do not match: the pricing page shows USD $29/$59/$99 per month, while MercadoPago is configured for ARS 25,000/month.

Additionally, `src/app/pricing-toggle.tsx` shows yet another pricing model: a single "ReservasAI Pro" plan at ARS 25,000/month or ARS 240,000/year -- a third inconsistent pricing presentation.

**Severity:** HIGH (completely misleading pricing -- customers see 3 tiers that do not exist)

---

### H02. Reservation PATCH `dateTime` not validated as a valid date

**File:** `src/app/api/reservations/[id]/route.ts` line 33
**Issue:** `new Date(dateTime)` is used directly without checking `isNaN(parsedDate.getTime())`. If an invalid date string is passed, it becomes `Invalid Date` and is saved to the database, which will either cause a Prisma error (crash) or corrupt data.

**Severity:** HIGH (crash on invalid input)

---

### H03. No `openaiApiKey` save/update endpoint with encryption

**Files:** Grep shows no route that writes `openaiApiKey` to the restaurant.
**Issue:** The WhatsApp settings route (`/api/settings/whatsapp`) saves `whatsappPhoneId` and `whatsappToken` (encrypted), but there is no corresponding endpoint to save `openaiApiKey`. The restaurant model has the field, and the AI agent reads it, but there is no way for the admin to set it through the API. This feature is broken or incomplete.

**Severity:** HIGH (feature gap -- AI agent cannot work with per-restaurant OpenAI keys)

---

### H04. `params` in `reservations/[id]/route.ts` not awaited (Next.js 15 breaking change)

**File:** `src/app/api/reservations/[id]/route.ts` lines 7-8
**Issue:** The PATCH and DELETE handlers destructure `params` synchronously: `const { id } = params`. In Next.js 15, `params` is a Promise and must be awaited: `const { id } = await params`. The team/[id] DELETE route correctly does `const { id } = await params`, but the reservations route does not. This will crash at runtime on Next.js 15.

**Severity:** HIGH (runtime crash on Next.js 15)

---

### H05. Cron reminders use server timezone, not restaurant timezone

**File:** `src/app/api/cron/reminders/route.ts` lines 20-25
**Issue:** The cron endpoint calculates "tomorrow" using `new Date()` (server time) and filters by `tomorrowStart`/`tomorrowEnd` in UTC. But `dateTime` in the database may be stored in the restaurant's local timezone context. If the server runs in UTC and the restaurant is in `America/Argentina/Buenos_Aires` (UTC-3), the "tomorrow" window will be offset by 3 hours, potentially missing some reservations or including wrong ones.

The `restaurant.timezone` field is fetched but only used for display formatting, not for the date range query.

**Severity:** HIGH (wrong reminders sent or reminders missed for restaurants in different timezones)

---

### H06. MercadoPago webhook returns 200 on all errors, including validation failures

**File:** `src/app/api/webhooks/mercadopago/route.ts` line 121
**Issue:** The catch block returns `status: 200` with a comment "prevent MercadoPago from retrying." However, the signature verification on line 18-19 correctly returns 401 (before the try-catch). The problem is that any error after signature verification (DB errors, API errors) is swallowed with a 200, making it impossible to detect failed payment processing. MercadoPago should retry on transient errors (5xx), not be told everything is fine.

**Severity:** HIGH (payment updates silently lost on transient failures)

---

## MEDIUM -- Missing Validation / UX Issues

### M01. No rate limiting on reservation CRUD endpoints

**Files:** `src/app/api/reservations/route.ts`, `src/app/api/reservations/[id]/route.ts`, `src/app/api/reservations/export/route.ts`, `src/app/api/reservations/stats/route.ts`
**Issue:** Rate limiting exists on auth endpoints (login, register, forgot-password, reset-password, agent test) but none of the reservation endpoints have rate limiting. An authenticated user could spam-create thousands of reservations or hammer the stats/export endpoints.

**Severity:** MEDIUM

---

### M02. No rate limiting on settings endpoints

**Files:** All `src/app/api/settings/*/route.ts`
**Issue:** No rate limiting on account updates, restaurant settings, team management, billing, whatsapp, or knowledge base endpoints. An attacker with a valid session could brute-force password changes or spam API calls.

**Severity:** MEDIUM

---

### M03. `customerName`, `customerPhone` not length-validated on reservation create/update

**File:** `src/app/api/reservations/route.ts` lines 83-91, `src/app/api/reservations/[id]/route.ts` lines 27-31
**Issue:** No maximum length check on `customerName`, `customerPhone`, or `customerEmail` fields. A malicious user could submit extremely long strings (megabytes) that would be stored in the database.

**Severity:** MEDIUM

---

### M04. No Zod schema validation on any POST/PATCH endpoint

**All API routes**
**Issue:** Every endpoint manually validates individual fields with `if` statements instead of using a schema validation library like Zod. This is error-prone and inconsistent. For example:
- Registration validates email format but team member creation also validates it (good) but with slightly different logic.
- Some routes check string lengths, others do not.
- No structured error responses for validation failures.

**Severity:** MEDIUM (maintainability and consistency risk)

---

### M05. `knowledgeBase` field has no size limit on PATCH

**File:** `src/app/api/settings/knowledge-base/route.ts` lines 12-16
**Issue:** The knowledge base endpoint only checks `typeof knowledgeBase !== "string"` but does not enforce any maximum length. Since it is stored as `@db.Text` (unlimited in PostgreSQL), a user could submit many megabytes of text, potentially causing memory and performance issues when it is injected into every AI prompt.

**Severity:** MEDIUM (DoS via large prompt injection, AI cost amplification)

---

### M06. Registration does not normalize email to lowercase

**File:** `src/app/api/register/route.ts` line 51-53
**Issue:** The `findUnique` check uses `where: { email }` with the raw email (not lowercased). But the team member creation route correctly uses `email.toLowerCase().trim()`. If a user registers with `User@Example.com`, and later someone tries to register with `user@example.com`, the uniqueness check might pass (depends on DB collation), creating duplicate accounts.

**Severity:** MEDIUM (potential duplicate accounts)

---

### M07. Registration email enumeration via timing

**File:** `src/app/api/register/route.ts` lines 55-59
**Issue:** The registration endpoint returns a specific `409` error "El email ya esta registrado" when a duplicate email is found. This allows an attacker to enumerate which emails are registered in the system (unlike the forgot-password endpoint which correctly returns a generic response).

**Severity:** MEDIUM (information disclosure)

---

### M08. `timezone` not validated on restaurant create or update

**Files:** `src/app/api/register/route.ts` line 85, `src/app/api/settings/restaurant/route.ts` line 75
**Issue:** The `timezone` field is accepted as-is without validation. Any arbitrary string can be stored. If an invalid timezone is used later with date formatting functions, it could cause runtime errors or incorrect time calculations.

**Severity:** MEDIUM

---

### M09. In-memory rate limiter ineffective in serverless deployments

**File:** `src/lib/rate-limit.ts` lines 1-6 (comment acknowledges this)
**Issue:** The rate limiter uses `Map` in memory. On Vercel or any serverless platform, each cold start gets a fresh Map, making rate limiting nearly useless under real traffic. The code has a comment acknowledging this and suggesting Upstash Redis, but it has not been implemented.

**Severity:** MEDIUM (rate limiting is effectively decorative in production)

---

### M10. WhatsApp webhook rate limiter also in-memory, never cleaned

**File:** `src/app/api/whatsapp/webhook/route.ts` lines 12-24
**Issue:** The `rateLimitMap` grows unboundedly. Every unique phone number adds an entry that is never removed. Over time this will cause memory leaks. The map also uses a separate implementation from the shared `lib/rate-limit.ts`.

**Severity:** MEDIUM (memory leak)

---

### M11. Billing POST does not validate subscription status transitions

**File:** `src/app/api/settings/billing/route.ts` lines 44-51
**Issue:** The endpoint only prevents creating a subscription if one is already ACTIVE with a MercadoPago ID. But it does not handle edge cases:
- A TRIALING user can create multiple MercadoPago subscriptions by calling POST repeatedly (the upsert just overwrites `mercadoPagoSubscriptionId`).
- A CANCELLED user can directly create a new subscription without any special handling.
- The `trialEndsAt` is always set to 14 days from now in the upsert `create` clause, even if the trial already expired.

**Severity:** MEDIUM (billing inconsistency)

---

## LOW -- Code Quality / Optimization

### L01. Duplicate `VALID_STATUSES` definitions

**Files:**
- `src/lib/validation.ts` line 16: `export const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const`
- `src/app/api/reservations/[id]/route.ts` line 42: `const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]` (local, not imported)

**Issue:** Status values are defined in two places. If the enum changes, the local copy in the PATCH handler will be out of sync.

**Severity:** LOW

---

### L02. Inconsistent error message handling across routes

**Issue:** Some routes check for both "Unauthorized" and "Forbidden" errors (settings routes), while others only check for "Unauthorized" (reservations routes, customers route). The `requireAdmin` helper can throw either, so all routes using it should handle both.

**Affected routes:**
- `src/app/api/customers/route.ts` -- missing "Forbidden" handling
- `src/app/api/reservations/stats/route.ts` -- missing "Forbidden" handling

**Severity:** LOW (incorrect HTTP status codes returned)

---

### L03. Two separate pricing components with inconsistent data

**Files:**
- `src/components/pricing-section.tsx` -- 3 tiers (Starter/Pro/Elite), USD + ARS prices
- `src/app/pricing-toggle.tsx` -- single "Pro" plan, ARS only

**Issue:** Two competing pricing UI components exist. It is unclear which is used where, and they present fundamentally different pricing models.

**Severity:** LOW (dead code / confusion)

---

### L04. `sendEmail` fire-and-forget without dead letter queue

**Files:** Multiple routes call `sendEmail(...).catch(err => console.error(...))`
**Issue:** Failed emails are logged but never retried. Welcome emails, team invites, and reservation confirmations can be silently lost. There is no tracking of email delivery status.

**Severity:** LOW (emails silently dropped)

---

### L05. Health endpoint exposes environment variable presence information

**File:** `src/app/api/health/route.ts` lines 16-22
**Issue:** The health check returns whether specific environment variables are set. While it does not expose values, it confirms which variables are configured, which could help an attacker map the infrastructure. Consider making the health endpoint return only `healthy`/`degraded` publicly, with details restricted to authenticated admins.

**Severity:** LOW (minor information disclosure)

---

### L06. `NEXTAUTH_URL` not in required env vars

**File:** `src/lib/env.ts` lines 6-10
**Issue:** `NEXTAUTH_URL` is not listed in required or optional env vars, yet it is used in multiple routes for constructing URLs (forgot-password reset link, team invite email, billing redirect). If not set, it falls back to `http://localhost:3000`, which will send broken links in production.

**Severity:** LOW (but would cause broken password reset and invite links in production)

---

### L07. `Reservation.dateTime` date range filter uses UTC midnight boundaries

**Files:** `src/app/api/reservations/route.ts` lines 33-35, `src/app/api/reservations/export/route.ts` lines 28-33
**Issue:** Date filtering constructs ranges like `new Date("2026-03-26T00:00:00.000Z")` to `new Date("2026-03-26T23:59:59.999Z")`, which is UTC midnight to UTC end-of-day. For Argentina (UTC-3), this means a query for "March 26" actually covers March 25 21:00 to March 26 21:00 local time, which is wrong.

**Severity:** LOW (wrong reservations shown for date filter, related to H05)

---

### L08. `Restaurant.whatsappToken` and `Restaurant.openaiApiKey` are nullable plain text columns

**File:** `prisma/schema.prisma` lines 75-76
**Issue:** These fields are `String?` with no database-level encryption. Encryption happens at the application layer only for `whatsappToken` (and only on write through the WhatsApp settings endpoint). If the database is compromised, all API keys are exposed. Consider using a dedicated secrets manager or at minimum ensuring all sensitive fields are encrypted at rest.

**Severity:** LOW (defense-in-depth)

---

### L09. No CORS configuration on API routes

**All API routes**
**Issue:** No explicit CORS headers are set on any API route. Next.js API routes in the same domain do not need CORS, but if the API is ever consumed from a different origin (mobile app, external integration), it will fail silently. There is also no protection against CSRF on state-changing endpoints beyond the session cookie.

**Severity:** LOW

---

### L10. `register` export in `instrumentation.ts` is the deprecated Next.js API

**File:** `src/instrumentation.ts`
**Issue:** Next.js 15 replaced the `register()` export in instrumentation.ts with `onRequestError` and module-level code. The `register` export still works but is deprecated and may be removed in future versions.

**Severity:** LOW

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 7     |
| HIGH     | 6     |
| MEDIUM   | 11    |
| LOW      | 10    |
| **Total**| **34**|

### Top Priority Fixes (recommended order):

1. **C03/C04** -- Add `maxPartySize`/`maxCapacity` validation to reservation POST and PATCH
2. **C05/H02** -- Add date validation to reservation PATCH (valid date + not in past)
3. **H04** -- Await `params` in `reservations/[id]/route.ts` (Next.js 15 crash)
4. **C01** -- Restructure middleware to protect API routes with explicit exceptions
5. **C02/L02** -- Add "Forbidden" error handling to all routes using `requireAdmin()`
6. **H01** -- Reconcile pricing tiers with billing backend (decide on tier model)
7. **C07/H03** -- Create `openaiApiKey` save endpoint with encryption
8. **M06** -- Normalize email to lowercase in registration
9. **H05/L07** -- Fix timezone-aware date filtering in reservations and cron
10. **H06** -- Return 5xx on transient errors in MercadoPago webhook
