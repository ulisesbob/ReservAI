import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set")
  return Buffer.from(key, "hex")
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(text: string): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(encryptedText: string): string {
  const key = getKey()
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":")
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted text format")
  }
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

/**
 * Tries to decrypt a value. If it fails (e.g. old unencrypted data),
 * returns the raw value as-is with a console warning.
 */
export function safeDecrypt(value: string): string {
  // Quick check: encrypted format is iv(32hex):authTag(32hex):ciphertext
  // If it doesn't contain exactly 2 colons, it's likely unencrypted
  const parts = value.split(":")
  if (parts.length !== 3) {
    console.warn("Value does not appear to be encrypted — using raw value")
    return value
  }
  try {
    return decrypt(value)
  } catch {
    console.warn("Failed to decrypt value — using raw value (possibly unencrypted legacy data)")
    return value
  }
}

/**
 * Masks a sensitive string, showing only the last 4 characters.
 */
export function maskSecret(value: string): string {
  if (value.length <= 4) return "****"
  return "\u2022".repeat(Math.min(value.length - 4, 20)) + value.slice(-4)
}

/**
 * Verifies a WhatsApp webhook signature using HMAC-SHA256.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) return true // Skip validation if not configured
  const expected = "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex")
  return signature === expected
}
