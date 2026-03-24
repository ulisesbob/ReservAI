import { createHmac, timingSafeEqual } from "crypto"

const SECRET = process.env.NEXTAUTH_SECRET || ""

/**
 * Creates a password reset token: base64url(userId:expiry:hmac)
 * Expires in 1 hour. No DB table needed — token is self-contained.
 */
export function createResetToken(userId: string): string {
  const expiry = Date.now() + 60 * 60 * 1000 // 1 hour
  const payload = `${userId}:${expiry}`
  const hmac = createHmac("sha256", SECRET).update(payload).digest("hex")
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url")
  return token
}

/**
 * Verifies and extracts userId from a reset token.
 * Returns null if invalid or expired.
 */
export function verifyResetToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(":")
    if (parts.length !== 3) return null

    const [userId, expiryStr, providedHmac] = parts
    const expiry = parseInt(expiryStr, 10)

    if (isNaN(expiry) || Date.now() > expiry) return null

    const payload = `${userId}:${expiryStr}`
    const expectedHmac = createHmac("sha256", SECRET).update(payload).digest("hex")

    const expectedBuf = Buffer.from(expectedHmac)
    const providedBuf = Buffer.from(providedHmac)
    if (expectedBuf.length !== providedBuf.length) return null
    if (!timingSafeEqual(expectedBuf, providedBuf)) return null

    return userId
  } catch {
    return null
  }
}
