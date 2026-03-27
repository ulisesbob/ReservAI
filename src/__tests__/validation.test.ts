/**
 * Unit tests for src/lib/validation.ts
 *
 * Tests: validatePassword, isValidTimezone, VALID_STATUSES
 * Runner: Node.js built-in test runner (no extra packages required)
 *
 * Run: node --experimental-strip-types src/__tests__/validation.test.ts
 * Or via: npm run test:unit
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { validatePassword, isValidTimezone, VALID_STATUSES } from "../lib/validation.ts"

// ─── validatePassword ─────────────────────────────────────────────────────

describe("validatePassword", () => {
  describe("valid passwords", () => {
    test("accepts a password meeting all requirements", () => {
      assert.strictEqual(validatePassword("SecurePass1"), null)
    })

    test("accepts password at minimum length (8 chars)", () => {
      assert.strictEqual(validatePassword("Abcdef1g"), null)
    })

    test("accepts password at maximum length (128 chars)", () => {
      const pwd = "Aa1" + "x".repeat(125)
      assert.strictEqual(validatePassword(pwd), null)
    })

    test("accepts password with special characters", () => {
      assert.strictEqual(validatePassword("MyP@ssw0rd!"), null)
    })
  })

  describe("too short", () => {
    test("rejects empty string", () => {
      const result = validatePassword("")
      assert.ok(result !== null, "Expected an error message")
      assert.ok(result!.includes("8"), `Expected message about 8 chars, got: ${result}`)
    })

    test("rejects 7-character password", () => {
      const result = validatePassword("Abc123X")
      assert.ok(result !== null, "Expected an error message")
    })

    test("rejects single character", () => {
      const result = validatePassword("A")
      assert.ok(result !== null, "Expected an error message")
    })
  })

  describe("too long", () => {
    test("rejects password longer than 128 characters", () => {
      const pwd = "Aa1" + "x".repeat(130)
      const result = validatePassword(pwd)
      assert.ok(result !== null, "Expected an error for overly long password")
    })
  })

  describe("missing character classes", () => {
    test("rejects password without uppercase letter", () => {
      const result = validatePassword("lowercase123")
      assert.ok(result !== null, "Expected error about uppercase")
      assert.ok(result!.toLowerCase().includes("mayúscula") || result!.toLowerCase().includes("uppercase"))
    })

    test("rejects password without lowercase letter", () => {
      const result = validatePassword("UPPERCASE123")
      assert.ok(result !== null, "Expected error about lowercase")
    })

    test("rejects password without a digit", () => {
      const result = validatePassword("NoDigitsHere")
      assert.ok(result !== null, "Expected error about number")
    })

    test("rejects all-numeric password", () => {
      const result = validatePassword("12345678")
      assert.ok(result !== null, "Expected error for all-numeric")
    })
  })

  describe("invalid types", () => {
    test("rejects non-string input (number)", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validatePassword(123 as any)
      assert.ok(result !== null, "Expected error for non-string")
    })

    test("rejects null input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validatePassword(null as any)
      assert.ok(result !== null, "Expected error for null")
    })
  })

  describe("boundary values", () => {
    test("exactly 8 characters — valid composition passes", () => {
      assert.strictEqual(validatePassword("Abcdef1g"), null)
    })

    test("exactly 8 characters — missing digit fails", () => {
      const result = validatePassword("Abcdefgh")
      assert.ok(result !== null)
    })

    test("exactly 128 characters — valid composition passes", () => {
      const pwd = "Aa1" + "b".repeat(125)
      assert.strictEqual(validatePassword(pwd), null)
    })

    test("129 characters rejects", () => {
      const pwd = "Aa1" + "b".repeat(126)
      assert.ok(validatePassword(pwd) !== null)
    })
  })
})

// ─── isValidTimezone ──────────────────────────────────────────────────────

describe("isValidTimezone", () => {
  describe("valid IANA timezones", () => {
    const valid = [
      "America/Argentina/Buenos_Aires",
      "America/Sao_Paulo",
      "America/New_York",
      "Europe/Madrid",
      "UTC",
      "America/Mexico_City",
      "Asia/Tokyo",
    ]
    for (const tz of valid) {
      test(`accepts "${tz}"`, () => {
        assert.strictEqual(isValidTimezone(tz), true)
      })
    }
  })

  describe("invalid timezones", () => {
    const invalid = [
      "",
      "America/Buenos_Aires_Typo",
      "Not/A/Timezone",
      "GMT+3",           // non-IANA format
      "UTC+5",           // non-IANA format
      "America",
      "random string",
    ]
    for (const tz of invalid) {
      test(`rejects "${tz}"`, () => {
        assert.strictEqual(isValidTimezone(tz), false)
      })
    }
  })
})

// ─── VALID_STATUSES ───────────────────────────────────────────────────────

describe("VALID_STATUSES", () => {
  test("contains exactly the 6 expected statuses", () => {
    const expected = ["PENDING", "PENDING_DEPOSIT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]
    assert.deepStrictEqual([...VALID_STATUSES], expected)
  })

  test("includes NO_SHOW", () => {
    assert.ok((VALID_STATUSES as readonly string[]).includes("NO_SHOW"))
  })

  test("each status is a non-empty string", () => {
    for (const s of VALID_STATUSES) {
      assert.ok(typeof s === "string" && s.length > 0)
    }
  })

  test("does not include invalid statuses", () => {
    assert.ok(!(VALID_STATUSES as readonly string[]).includes("DELETED"))
    assert.ok(!(VALID_STATUSES as readonly string[]).includes("ACTIVE"))
    assert.ok(!(VALID_STATUSES as readonly string[]).includes(""))
  })
})
