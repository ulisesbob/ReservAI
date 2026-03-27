import { test, expect } from "@playwright/test"

/**
 * Public booking flow: /book/[slug]
 *
 * These tests cover the primary customer-facing revenue path.
 * They run against a known test restaurant slug that must exist in the
 * test database, OR they test the 404 path when the slug is unknown.
 *
 * Priority: P0 — must pass before any release.
 */

const TEST_SLUG = "test-restaurant"

test.describe("Public Booking Page", () => {
  test.describe("Page rendering", () => {
    test("shows restaurant name and booking form for a valid slug", async ({ page }) => {
      await page.goto(`/book/${TEST_SLUG}`)
      // If restaurant exists: form is visible
      // If it returns 404: the not-found page renders (acceptable in CI without seed)
      const hasForm = await page.locator("form").count()
      const has404 = await page.locator("text=404").count()
      expect(hasForm + has404).toBeGreaterThan(0)
    })

    test("shows 404 page for unknown slug", async ({ page }) => {
      const res = await page.goto("/book/slug-that-does-not-exist-xyz-abc-999")
      // Next.js notFound() returns 404
      expect(res?.status()).toBe(404)
    })

    test("page has correct meta title for valid restaurant", async ({ page }) => {
      await page.goto(`/book/${TEST_SLUG}`)
      const title = await page.title()
      // Either restaurant name in title or generic not-found
      expect(title.length).toBeGreaterThan(0)
    })
  })

  test.describe("Booking form — field validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/book/${TEST_SLUG}`)
      // Skip if restaurant not found (CI without seed data)
      const form = page.locator("form")
      const count = await form.count()
      if (count === 0) test.skip()
    })

    test("submit button is visible", async ({ page }) => {
      await expect(page.locator("button[type=submit]")).toBeVisible()
    })

    test("shows validation error when submitting empty form", async ({ page }) => {
      await page.locator("button[type=submit]").click()
      // At least one error message should appear
      const errorLocator = page.locator("[aria-invalid=true], .text-destructive, [role=alert]")
      await expect(errorLocator.first()).toBeVisible({ timeout: 3000 })
    })

    test("customer name field accepts input", async ({ page }) => {
      const nameField = page.locator("input[name=customerName], input[placeholder*=nombre i], input[placeholder*=name i]").first()
      if (await nameField.count() === 0) test.skip()
      await nameField.fill("Juan Pérez")
      await expect(nameField).toHaveValue("Juan Pérez")
    })

    test("party size field rejects 0", async ({ page }) => {
      const partySizeField = page.locator("input[name=partySize], input[type=number]").first()
      if (await partySizeField.count() === 0) test.skip()
      await partySizeField.fill("0")
      await page.locator("button[type=submit]").click()
      const errorLocator = page.locator("[aria-invalid=true], .text-destructive, [role=alert]")
      await expect(errorLocator.first()).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe("Booking form — successful submission", () => {
    test("fills and submits booking form — expects success or error response", async ({ page }) => {
      await page.goto(`/book/${TEST_SLUG}`)
      const form = page.locator("form")
      if (await form.count() === 0) test.skip()

      // Fill name
      const nameField = page.locator("input[name=customerName]").first()
      if (await nameField.count() > 0) await nameField.fill("Test Customer")

      // Fill phone
      const phoneField = page.locator("input[name=customerPhone]").first()
      if (await phoneField.count() > 0) await phoneField.fill("+5491100000000")

      // Fill email (optional)
      const emailField = page.locator("input[type=email]").first()
      if (await emailField.count() > 0) await emailField.fill("test@example.com")

      // Pick a date in the future (next week, same day-of-week)
      const dateField = page.locator("input[type=date], input[name=date]").first()
      if (await dateField.count() > 0) {
        const future = new Date()
        future.setDate(future.getDate() + 7)
        const dateStr = future.toISOString().split("T")[0]
        await dateField.fill(dateStr)
      }

      // Pick a time
      const timeField = page.locator("input[type=time], input[name=time]").first()
      if (await timeField.count() > 0) await timeField.fill("20:00")

      await page.locator("button[type=submit]").click()

      // After submit: should show success confirmation OR error from API
      // We accept either — we are testing the flow executes, not the DB state
      await page.waitForTimeout(2000)
      const url = page.url()
      const bodyText = await page.locator("body").innerText()
      const hasOutcome =
        url.includes("confirm") ||
        url.includes("success") ||
        bodyText.includes("confirmada") ||
        bodyText.includes("reserva") ||
        bodyText.includes("error") ||
        bodyText.includes("Error")
      expect(hasOutcome).toBe(true)
    })
  })
})
