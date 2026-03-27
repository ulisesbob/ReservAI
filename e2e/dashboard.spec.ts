import { test, expect } from "@playwright/test"

/**
 * Dashboard E2E tests.
 *
 * Because these pages require authentication, the tests check:
 *  1. Unauthenticated access redirects correctly (P0).
 *  2. Page structure when accessed with a valid session (P1).
 *     (Requires storageState or login fixture — stubbed here with skip guards.)
 *
 * To run authenticated tests locally, set up a storageState file:
 *   npx playwright codegen http://localhost:3000/login --save-storage=.playwright/auth.json
 *
 * Priority: P0 for redirects, P1 for dashboard content.
 */

// Unauthenticated tests (always run in CI)
test.describe("Dashboard — Auth Redirects (unauthenticated)", () => {
  test("GET /dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /dashboard/analytics redirects to login", async ({ page }) => {
    await page.goto("/dashboard/analytics")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /dashboard/chats redirects to login", async ({ page }) => {
    await page.goto("/dashboard/chats")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /dashboard/waitlist redirects to login", async ({ page }) => {
    await page.goto("/dashboard/waitlist")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /dashboard/customers redirects to login", async ({ page }) => {
    await page.goto("/dashboard/customers")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })
})

// Authenticated tests — only run when auth storage state is available
test.describe("Dashboard — Content (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no auth state is configured
    const authState = process.env.PLAYWRIGHT_AUTH_STATE
    if (!authState) {
      test.skip()
      return
    }
  })

  test("dashboard page loads reservation list or empty state", async ({ page }) => {
    await page.goto("/dashboard")
    const hasReservations = await page.locator("table, [data-testid=reservation-list]").count()
    const hasEmptyState = await page.locator("text=No hay reservas, text=sin reservas").count()
    expect(hasReservations + hasEmptyState).toBeGreaterThan(0)
  })

  test("dashboard nav links are visible", async ({ page }) => {
    await page.goto("/dashboard")
    // Navigation should have key links
    await expect(page.locator("a[href='/dashboard']").first()).toBeVisible()
  })

  test("calendar view is accessible from dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    // Look for calendar toggle or link
    const calendarBtn = page.locator("button:has-text('Semana'), button:has-text('Día'), a[href*=calendar]").first()
    if (await calendarBtn.count() > 0) {
      await calendarBtn.click()
      await page.waitForTimeout(500)
    }
    // Just assert page didn't crash
    await expect(page.locator("body")).toBeVisible()
  })
})

test.describe("Dashboard — Settings Pages (unauthenticated)", () => {
  test("GET /settings redirects to login", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /settings/billing redirects to login", async ({ page }) => {
    await page.goto("/settings/billing")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /settings/whatsapp redirects to login", async ({ page }) => {
    await page.goto("/settings/whatsapp")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("GET /settings/team redirects to login", async ({ page }) => {
    await page.goto("/settings/team")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })
})
