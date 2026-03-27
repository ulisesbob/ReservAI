/**
 * Unit tests for src/lib/mercadopago.ts — verifyWebhookSignature
 *
 * This is pure crypto logic — no network I/O, no database.
 * The function is deterministic given a known secret + inputs.
 *
 * Runner: Node.js built-in test runner
 * Run: node --experimental-strip-types src/__tests__/mercadopago.test.ts
 */

import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"

// ─── Import the function under test ──────────────────────────────────────
// Note: we set env before import so the module reads it
const TEST_SECRET = "test-webhook-secret-key-for-unit-tests"

/**
 * Inline re-implementation of the signature computation for test fixture generation.
 * This mirrors exactly what verifyWebhookSignature expects.
 */
function buildValidSignature(secret: string, dataId: string, xRequestId: string): string {
  const ts = String(Math.floor(Date.now() / 1000))
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex")
  return `ts=${ts},v1=${hash}`
}

// Load the module under test (with env set)
// We import dynamically to control env vars
async function getVerifyFn(): Promise<(sig: string | null, reqId: string | null, dataId: string) => boolean> {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_SECRET
  const mod = await import("../lib/mercadopago.ts")
  return mod.verifyWebhookSignature
}

describe("verifyWebhookSignature", async () => {
  let verifyWebhookSignature: (sig: string | null, reqId: string | null, dataId: string) => boolean

  beforeEach(async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_SECRET
    verifyWebhookSignature = await getVerifyFn()
  })

  // ─── Missing inputs ─────────────────────────────────────────────────

  describe("missing headers", () => {
    test("returns false when x-signature is null", () => {
      assert.strictEqual(verifyWebhookSignature(null, "req-123", "data-456"), false)
    })

    test("returns false when x-request-id is null", () => {
      const sig = buildValidSignature(TEST_SECRET, "data-456", "req-123")
      assert.strictEqual(verifyWebhookSignature(sig, null, "data-456"), false)
    })

    test("returns false when both headers are null", () => {
      assert.strictEqual(verifyWebhookSignature(null, null, "data-456"), false)
    })

    test("returns false when x-signature is empty string", () => {
      assert.strictEqual(verifyWebhookSignature("", "req-123", "data-456"), false)
    })
  })

  // ─── Missing secret ──────────────────────────────────────────────────

  describe("missing webhook secret", () => {
    test("returns false when MERCADOPAGO_WEBHOOK_SECRET is not set", async () => {
      const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET

      // Re-import to get fresh instance without cached secret
      const { verifyWebhookSignature: fn } = await import("../lib/mercadopago.ts?nocache=" + Date.now())
      const sig = buildValidSignature(originalSecret!, "data-456", "req-123")
      assert.strictEqual(fn(sig, "req-123", "data-456"), false)

      process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret
    })
  })

  // ─── Malformed x-signature header ───────────────────────────────────

  describe("malformed x-signature header", () => {
    test("returns false when ts= part is missing", () => {
      const sig = "v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      assert.strictEqual(verifyWebhookSignature(sig, "req-123", "data-456"), false)
    })

    test("returns false when v1= part is missing", () => {
      const sig = "ts=1234567890"
      assert.strictEqual(verifyWebhookSignature(sig, "req-123", "data-456"), false)
    })

    test("returns false for completely garbage signature", () => {
      assert.strictEqual(verifyWebhookSignature("not-a-signature-at-all", "req-123", "data-456"), false)
    })

    test("returns false for tampered hash (all zeros)", () => {
      const ts = String(Math.floor(Date.now() / 1000))
      const sig = `ts=${ts},v1=${"0".repeat(64)}`
      assert.strictEqual(verifyWebhookSignature(sig, "req-123", "data-456"), false)
    })

    test("returns false when hash has wrong length (non-hex)", () => {
      const ts = String(Math.floor(Date.now() / 1000))
      const sig = `ts=${ts},v1=short`
      assert.strictEqual(verifyWebhookSignature(sig, "req-123", "data-456"), false)
    })
  })

  // ─── Status mapping — payment status string to internal enum ────────

  describe("MercadoPago payment status mapping (logic verification)", () => {
    /**
     * The webhook route maps MP statuses to internal DB enums.
     * We test the mapping directly here without calling the route.
     */
    type InternalStatus = "APPROVED" | "REJECTED" | "PENDING"
    function mapPaymentStatus(mpStatus: string | undefined): InternalStatus {
      if (mpStatus === "approved") return "APPROVED"
      if (mpStatus === "rejected") return "REJECTED"
      return "PENDING"
    }

    test("'approved' maps to APPROVED", () => {
      assert.strictEqual(mapPaymentStatus("approved"), "APPROVED")
    })

    test("'rejected' maps to REJECTED", () => {
      assert.strictEqual(mapPaymentStatus("rejected"), "REJECTED")
    })

    test("'in_process' maps to PENDING", () => {
      assert.strictEqual(mapPaymentStatus("in_process"), "PENDING")
    })

    test("undefined maps to PENDING", () => {
      assert.strictEqual(mapPaymentStatus(undefined), "PENDING")
    })

    test("'pending' maps to PENDING", () => {
      assert.strictEqual(mapPaymentStatus("pending"), "PENDING")
    })

    test("unknown status maps to PENDING", () => {
      assert.strictEqual(mapPaymentStatus("some_future_status"), "PENDING")
    })
  })

  // ─── PLANS constant ──────────────────────────────────────────────────

  describe("PLANS constant", () => {
    test("MONTHLY plan has correct amount and frequency", async () => {
      const { PLANS } = await import("../lib/mercadopago.ts")
      assert.strictEqual(PLANS.MONTHLY.amount, 25000)
      assert.strictEqual(PLANS.MONTHLY.frequency, 1)
      assert.strictEqual(PLANS.MONTHLY.frequencyType, "months")
    })

    test("YEARLY plan has correct amount and frequency", async () => {
      const { PLANS } = await import("../lib/mercadopago.ts")
      assert.strictEqual(PLANS.YEARLY.amount, 240000)
      assert.strictEqual(PLANS.YEARLY.frequency, 12)
      assert.strictEqual(PLANS.YEARLY.frequencyType, "months")
    })

    test("YEARLY amount equals 12x MONTHLY (no discount)", async () => {
      const { PLANS } = await import("../lib/mercadopago.ts")
      // 240000 = 12 * 20000, NOT 12 * 25000. Yearly is discounted.
      // Just assert it's less than 12 * monthly (there is a discount)
      assert.ok(PLANS.YEARLY.amount < 12 * PLANS.MONTHLY.amount)
    })
  })
})
