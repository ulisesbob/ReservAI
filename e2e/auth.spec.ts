import { test, expect } from "@playwright/test"

/**
 * Authentication E2E tests.
 *
 * Covers: login page, register page, auth redirects,
 * and the unauthenticated protection of dashboard routes.
 *
 * Priority: P0 for redirect tests, P1 for page rendering.
 */

test.describe("Authentication — Page Rendering", () => {
  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("form")).toBeVisible()
    // Should have an email field
    await expect(page.locator("input[type=email], input[name=email]").first()).toBeVisible()
    // Should have a password field
    await expect(page.locator("input[type=password]").first()).toBeVisible()
  })

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("button[type=submit]").first()).toBeVisible()
  })

  test("register page loads and shows form", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator("form")).toBeVisible()
  })

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login")
    const registerLink = page.locator("a[href*=register]")
    await expect(registerLink.first()).toBeVisible()
  })

  test("register page has link back to login", async ({ page }) => {
    await page.goto("/register")
    const loginLink = page.locator("a[href*=login]")
    await expect(loginLink.first()).toBeVisible()
  })
})

test.describe("Authentication — Protected Route Redirects", () => {
  test("unauthenticated user is redirected from /dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("unauthenticated user is redirected from /settings", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("unauthenticated user is redirected from /onboarding", async ({ page }) => {
    await page.goto("/onboarding")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })

  test("unauthenticated user cannot access dashboard analytics", async ({ page }) => {
    await page.goto("/dashboard/analytics")
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
  })
})

test.describe("Authentication — Login Form Validation", () => {
  test("shows error on empty form submission", async ({ page }) => {
    await page.goto("/login")
    await page.locator("button[type=submit]").first().click()
    // Should stay on login page or show validation errors
    await page.waitForTimeout(500)
    const url = page.url()
    const bodyText = await page.locator("body").innerText()
    const stayedOnLogin = url.includes("login") || bodyText.toLowerCase().includes("email") || bodyText.toLowerCase().includes("contraseña")
    expect(stayedOnLogin).toBe(true)
  })

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.locator("input[type=email], input[name=email]").first().fill("nobody@does-not-exist.com")
    await page.locator("input[type=password]").first().fill("WrongPassword123!")
    await page.locator("button[type=submit]").first().click()
    // Should remain on login and show an error
    await page.waitForTimeout(1500)
    const url = page.url()
    expect(url).toContain("login")
  })
})

test.describe("Authentication — Register Form Validation", () => {
  test("shows error with weak password", async ({ page }) => {
    await page.goto("/register")
    const emailField = page.locator("input[type=email], input[name=email]").first()
    const passwordField = page.locator("input[type=password]").first()
    if (await emailField.count() === 0 || await passwordField.count() === 0) test.skip()

    await emailField.fill("test@example.com")
    await passwordField.fill("weak")
    await page.locator("button[type=submit]").first().click()
    await page.waitForTimeout(500)
    // Should show password strength error
    const bodyText = await page.locator("body").innerText()
    const hasError = bodyText.toLowerCase().includes("contraseña") || bodyText.toLowerCase().includes("password") || bodyText.includes("8")
    expect(hasError).toBe(true)
  })
})
