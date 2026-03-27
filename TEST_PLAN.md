# ReservasAI — Test Plan

**Version:** 1.0  
**Date:** 2026-03-27  
**Branch:** feature/testing-suite  
**Test Engineer:** QA Expert Agent

---

## 1. Application Overview

ReservasAI is a SaaS platform for restaurant reservation management. It provides:
- Public booking pages (`/book/[slug]`) for end customers
- A restaurant dashboard for managing reservations, calendar, waitlist, and billing
- A WhatsApp AI agent (OpenAI function calling) that creates reservations via chat
- MercadoPago subscription billing with webhook processing
- A 5-step onboarding wizard for new restaurants

**Stack:** Next.js 14, Prisma/PostgreSQL, NextAuth v5, Resend emails, Redis rate limiting, Sentry

---

## 2. Current Test Coverage Baseline

| Area | Status | Notes |
|---|---|---|
| E2E — public booking flow | Skeleton only (3 lines) | No form interaction, no submission |
| E2E — auth (login/register) | Skeleton only | Only checks page load |
| E2E — API health | Minimal | 2 assertions |
| Unit tests | None | No test runner configured |
| Integration tests | None | |
| CI — test execution | Not wired | ci.yml runs lint/build only |

**Coverage estimate: ~2%** (3 spec files, all stubs)

---

## 3. Risk Assessment

### Critical Risk Areas (must test first)

| ID | Area | Risk | Business Impact |
|---|---|---|---|
| R01 | Reservation capacity validation | BUG C03/C04 confirmed — POST/PATCH bypass maxPartySize | Overbooking, revenue loss |
| R02 | Past-date reservation validation | BUG C05 confirmed — PATCH allows past dates | Data integrity |
| R03 | MercadoPago webhook signature | Core billing security | Fraudulent subscription activation |
| R04 | Public booking form submission | Primary revenue path | Direct customer impact |
| R05 | AI agent parseToolCallArgs | Malformed JSON crashes reservation creation | WhatsApp channel failure |
| R06 | Email graceful failure | App must not crash when RESEND not configured | Onboarding reliability |
| R07 | Dashboard auth protection | Unauthenticated access | Data exposure |
| R08 | Onboarding wizard completion | New user activation funnel | Churn at step 1 |

### Medium Risk Areas

| ID | Area | Risk |
|---|---|---|
| R09 | Waitlist notify flow | Race condition on expiry |
| R10 | Password validation | Brute-force or weak passwords accepted |
| R11 | Zod schema parseBody helper | Incorrect error message surfaced |
| R12 | Timezone date filtering | Off-by-one for restaurants not in UTC-3 |

---

## 4. Test Types and Scope

### 4.1 Unit Tests (Jest / Node test runner)
Target: Pure business logic functions with no I/O dependencies.

| Module | Functions to Test |
|---|---|
| `src/lib/validation.ts` | `validatePassword`, `isValidTimezone`, `VALID_STATUSES` |
| `src/lib/ai-agent.ts` | `parseToolCallArgs` (exported via module internals), `buildConfirmationText` |
| `src/lib/mercadopago.ts` | `verifyWebhookSignature` |
| `src/lib/email.ts` | `isEmailConfigured`, `sendEmail` graceful failure |
| `src/lib/schemas.ts` | All Zod schemas via `parseBody`, boundary conditions |

### 4.2 E2E Tests (Playwright)
Target: Full user journeys through the browser.

| Flow | Priority |
|---|---|
| Public booking: view form → fill → submit → confirmation | P0 |
| Dashboard: login → view reservations list | P0 |
| Dashboard: calendar view loads and shows reservations | P1 |
| Waitlist: join form → success state | P1 |
| Billing: settings/billing page renders plan info | P1 |
| Onboarding: 5-step wizard navigation | P1 |
| Auth: register → login → logout | P1 |
| Auth: protected routes redirect to login | P0 |

### 4.3 API Integration Tests (Playwright `request` fixture)
Target: API endpoints, auth enforcement, validation responses.

| Endpoint | Tests |
|---|---|
| `POST /api/reservations` | Valid creation, past date rejection, maxPartySize rejection, missing fields |
| `GET /api/reservations` | Auth required, pagination params |
| `POST /api/webhooks/mercadopago` | Valid signature passes, invalid signature rejects |
| `GET /api/health` | Returns 200 |
| `POST /api/auth/register` | Schema validation |

---

## 5. Test Execution Strategy

### 5.1 Local Development
```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e

# Run specific file
npx playwright test e2e/public-booking.spec.ts

# Run in headed mode for debugging
npx playwright test --headed

# Run unit tests
npm run test:unit
```

### 5.2 CI Pipeline
- Trigger: every push to `main` and every pull request targeting `main`
- E2E: runs against a test database (`DATABASE_URL` from CI secret)
- Unit tests: run in isolation, no database required
- Artifacts: Playwright HTML report uploaded on failure

---

## 6. Test Data Strategy

- E2E tests use unique slugs generated per test run (`test-restaurant-${Date.now()}`)
- No shared mutable state between tests
- Each E2E test that requires a booking page uses the widget API to pre-create test restaurant data, OR tests against a known test fixture slug
- Unit tests use pure in-memory inputs — no database, no network

---

## 7. Exit Criteria

| Metric | Target |
|---|---|
| Unit test coverage — business logic | > 90% branch coverage |
| E2E — P0 flows passing | 100% |
| E2E — P1 flows passing | > 85% |
| Zero known critical bugs untested | Confirmed |
| CI pipeline green on `main` | Required for merge |

---

## 8. Out of Scope (this iteration)

- WhatsApp webhook end-to-end (requires Meta test environment)
- Visual regression testing
- Load / performance testing
- Mobile device matrix (deferred to dedicated mobile testing sprint)
- Accessibility audit (planned separately)

---

## 9. Files Created

```
e2e/
  public-booking.spec.ts     # Replaced — full booking flow
  auth.spec.ts               # Replaced — auth journeys
  api.spec.ts                # Replaced — API contract tests
  dashboard.spec.ts          # New — dashboard + calendar
  waitlist.spec.ts           # New — waitlist flow
  billing.spec.ts            # New — billing page
  onboarding.spec.ts         # New — 5-step wizard

src/__tests__/
  validation.test.ts         # Unit — validatePassword, isValidTimezone
  ai-agent.test.ts           # Unit — parseToolCallArgs, confirmation text
  mercadopago.test.ts        # Unit — verifyWebhookSignature
  email.test.ts              # Unit — graceful failure, isEmailConfigured
  schemas.test.ts            # Unit — Zod schemas, parseBody

.github/workflows/
  test.yml                   # New — dedicated test workflow
```
