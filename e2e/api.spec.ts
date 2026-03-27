import { test, expect } from "@playwright/test"

test.describe("API Health", () => {
  test("health endpoint responds", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.status()).toBe(200)
  })

  test("protected endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/reservations")
    expect(response.status()).toBe(401)
  })
})
