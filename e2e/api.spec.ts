import { test, expect } from "@playwright/test"

/**
 * API contract tests using Playwright's `request` fixture.
 *
 * These do NOT require a browser — they test HTTP endpoints directly.
 * Covers auth enforcement, input validation, and health checks.
 *
 * Priority: P0 for auth + health, P1 for validation paths.
 */

test.describe("API — Health", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.status()).toBe(200)
  })

  test("GET /api/health returns JSON body", async ({ request }) => {
    const res = await request.get("/api/health")
    const body = await res.json()
    expect(typeof body).toBe("object")
  })
})

test.describe("API — Auth Enforcement", () => {
  test("GET /api/reservations requires authentication — returns 401", async ({ request }) => {
    const res = await request.get("/api/reservations")
    expect(res.status()).toBe(401)
  })

  test("POST /api/reservations requires authentication — returns 401", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {
        customerName: "Test User",
        customerPhone: "+5491100000000",
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        partySize: 2,
      },
    })
    expect(res.status()).toBe(401)
  })

  test("GET /api/customers requires authentication — returns 401", async ({ request }) => {
    const res = await request.get("/api/customers")
    expect(res.status()).toBe(401)
  })

  test("GET /api/analytics requires authentication — returns 401", async ({ request }) => {
    const res = await request.get("/api/analytics")
    expect(res.status()).toBe(401)
  })

  test("GET /api/settings/restaurant requires authentication — returns 401", async ({ request }) => {
    const res = await request.get("/api/settings/restaurant")
    expect(res.status()).toBe(401)
  })
})

test.describe("API — Public Booking Endpoint", () => {
  test("POST /api/book/[slug] with unknown slug returns 404", async ({ request }) => {
    const res = await request.post("/api/book/slug-xyz-does-not-exist-999", {
      data: {
        customerName: "Test",
        customerPhone: "+5491100000000",
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        partySize: 2,
      },
    })
    // Should be 404 (not found) or 400 (validation error before lookup)
    expect([400, 404]).toContain(res.status())
  })
})

test.describe("API — Reservation Input Validation", () => {
  /**
   * These tests verify the validation layer without needing auth.
   * They expect 401 (auth fails first) but the intent is to confirm
   * that the endpoint is reachable and behaves predictably.
   *
   * When running against a seeded test environment with valid session
   * cookies, these would return 400 for invalid inputs.
   */
  test("POST /api/reservations — endpoint exists (returns 400 or 401)", async ({ request }) => {
    const res = await request.post("/api/reservations", {
      data: {},
    })
    expect([400, 401, 422]).toContain(res.status())
  })
})

test.describe("API — Webhook Endpoints", () => {
  test("POST /api/webhooks/mercadopago without signature returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/webhooks/mercadopago", {
      data: { type: "payment", data: { id: "12345" } },
    })
    // No signature → should reject
    expect([400, 401]).toContain(res.status())
  })

  test("POST /api/webhooks/mercadopago with tampered signature returns 401", async ({ request }) => {
    const res = await request.post("/api/webhooks/mercadopago", {
      headers: {
        "x-signature": "ts=1234567890,v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "x-request-id": "fake-request-id",
      },
      data: { type: "payment", data: { id: "12345" } },
    })
    expect(res.status()).toBe(401)
  })
})
