import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("text=Iniciar")).toBeVisible()
  })

  test("register page loads", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator("text=Crear")).toBeVisible()
  })

  test("unauthenticated user redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/login/)
  })
})
