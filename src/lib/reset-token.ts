import { createHmac, timingSafeEqual } from "crypto"

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for reset tokens")
  return secret
}

/**
 * Creates a password reset token: base64url(userId|expiry|issuedAt|hmac)
 * Expires in 1 hour. Uses | as delimiter (safe for CUID userIds).
 * issuedAt is included so the reset-password endpoint can reject tokens
 * issued before the last password change (single-use protection).
 */
export function createResetToken(userId: string): string {
  const issuedAt = Date.now()
  const expiry = issuedAt + 60 * 60 * 1000 // 1 hour
  const payload = `${userId}|${expiry}|${issuedAt}`
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}|${hmac}`).toString("base64url")
}

interface ResetTokenPayload {
  userId: string
  issuedAt: number
}

/**
 * Verifies and extracts userId + issuedAt from a reset token.
 * Returns null if invalid or expired.
 */
export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split("|")
    if (parts.length !== 4) return null

    const [userId, expiryStr, issuedAtStr, providedHmac] = parts
    const expiry = parseInt(expiryStr, 10)
    const issuedAt = parseInt(issuedAtStr, 10)

    if (isNaN(expiry) || isNaN(issuedAt) || Date.now() > expiry) return null

    const payload = `${userId}|${expiryStr}|${issuedAtStr}`
    const expectedHmac = createHmac("sha256", getSecret()).update(payload).digest("hex")

    const expectedBuf = Buffer.from(expectedHmac)
    const providedBuf = Buffer.from(providedHmac)
    if (expectedBuf.length !== providedBuf.length) return null
    if (!timingSafeEqual(expectedBuf, providedBuf)) return null

    return { userId, issuedAt }
  } catch {
    return null
  }
}
