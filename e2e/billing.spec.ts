import { test, expect } from "@playwright/test"

/**
 * Billing E2E tests.
 *
 * Covers:
 * - Auth protection on billing settings page
 * - API validation for billing endpoint
 * - Plan selection UI (authenticated, guarded by skip)
 *
 * Priority: P1
 */

test.describe("Billing — Auth Protection", () => {
  test("GET /settings/billing redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/settings/billing")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })
})

test.describe("Billing — API Validation", () => {
  test("POST /api/billing without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/billing", {
      data: { plan: "MONTHLY" },
    })
    expect(res.status()).toBe(401)
  })

  test("POST /api/billing with invalid plan returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/billing", {
      data: { plan: "INVALID_PLAN" },
    })
    // Auth check runs first (401) or schema validation (400)
    expect([400, 401, 422]).toContain(res.status())
  })

  test("POST /api/billing without plan field returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/billing", {
      data: {},
    })
    expect([400, 401, 422]).toContain(res.status())
  })
})

test.describe("Billing — Plan Page (authenticated)", () => {
  test.beforeEach(async () => {
    if (!process.env.PLAYWRIGHT_AUTH_STATE) {
      test.skip()
    }
  })

  test("billing page shows plan options", async ({ page }) => {
    await page.goto("/settings/billing")
    await expect(page.locator("body")).toBeVisible()
    // Should show MONTHLY and/or YEARLY plan info
    const bodyText = await page.locator("body").innerText()
    const hasPlans = bodyText.includes("Mensual") || bodyText.includes("Anual") || bodyText.includes("Plan")
    expect(hasPlans).toBe(true)
  })

  test("billing page shows subscription status", async ({ page }) => {
    await page.goto("/settings/billing")
    const bodyText = await page.locator("body").innerText()
    // Should show some billing state
    const hasBillingInfo =
      bodyText.toLowerCase().includes("suscripción") ||
      bodyText.toLowerCase().includes("plan") ||
      bodyText.toLowerCase().includes("activo")
    expect(hasBillingInfo).toBe(true)
  })
})
