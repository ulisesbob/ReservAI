import { test, expect } from "@playwright/test"

test.describe("Public Pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=ReservasAI")).toBeVisible()
  })
})
