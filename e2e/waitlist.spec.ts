import { test, expect } from "@playwright/test"

/**
 * Waitlist E2E tests.
 *
 * The waitlist join form is embedded in the public booking widget and
 * also has a dedicated API endpoint. Tests cover:
 * - The waitlist API endpoint validation
 * - The UI path when a time slot is full
 *
 * Priority: P1
 */

const TEST_SLUG = "test-restaurant"

test.describe("Waitlist — API Endpoint", () => {
  test("POST /api/waitlist without auth returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: {
        restaurantId: "some-id",
        customerName: "Test",
        customerPhone: "+5491100000000",
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        partySize: 2,
      },
    })
    // Public endpoint — should return 400 (invalid restaurant) or 404/401
    expect([400, 401, 404, 422]).toContain(res.status())
  })

  test("POST /api/waitlist with missing required fields returns 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: {
        customerName: "Test",
        // missing restaurantId, phone, dateTime, partySize
      },
    })
    expect([400, 401, 422]).toContain(res.status())
  })

  test("POST /api/waitlist with invalid email returns 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: {
        restaurantId: "some-id",
        customerName: "Test",
        customerPhone: "+5491100000000",
        customerEmail: "not-an-email",
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        partySize: 2,
      },
    })
    expect([400, 401, 422]).toContain(res.status())
  })
})

test.describe("Waitlist — Public Booking Page Integration", () => {
  test("booking page for known slug does not show a JavaScript crash", async ({ page }) => {
    const res = await page.goto(`/book/${TEST_SLUG}`)
    // 404 is fine (no seed data), 200 should not have console errors
    const status = res?.status()
    if (status === 404) return // skip rest — no restaurant in test DB

    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))
    await page.waitForTimeout(1000)
    expect(errors.filter((e) => !e.includes("Warning"))).toHaveLength(0)
  })

  test("waitlist form is accessible from booking page when restaurant exists", async ({ page }) => {
    await page.goto(`/book/${TEST_SLUG}`)
    const form = page.locator("form")
    if (await form.count() === 0) test.skip()

    // If there is a waitlist section/tab, it should be accessible
    const waitlistTab = page.locator("button:has-text('Lista de espera'), a:has-text('Lista de espera'), [data-testid=waitlist-tab]")
    if (await waitlistTab.count() > 0) {
      await waitlistTab.first().click()
      await expect(page.locator("form").first()).toBeVisible()
    }
  })
})
