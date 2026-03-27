// TODO: Set RESEND_API_KEY in your environment variables to enable email sending.
// Get your API key at https://resend.com — add it to .env.local (dev) and your
// hosting provider's environment config (production).
// Also set RESEND_FROM_EMAIL to a verified domain address, e.g. "no-reply@yourdomain.com".
// Without RESEND_API_KEY, all email sends are silently skipped (the app will NOT crash).

import { Resend } from "resend"

// Cached singleton — created once on first successful use.
let resendInstance: Resend | null = null

/**
 * Returns the Resend client, or null when RESEND_API_KEY is not configured.
 * Never throws — callers must handle a null return.
 */
function getResend(): Resend | null {
  if (resendInstance) return resendInstance

  const key = process.env.RESEND_API_KEY
  if (!key) {
    return null
  }

  resendInstance = new Resend(key)
  return resendInstance
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

export type EmailResult =
  | { success: true; id: string }
  | { success: false; error: string; skipped?: boolean }

/**
 * Sends a transactional email via Resend.
 *
 * - Returns { success: false, skipped: true } when RESEND_API_KEY is not set
 *   so callers can distinguish "not configured" from "delivery failure".
 * - Never throws — all errors are caught and returned as { success: false }.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}): Promise<EmailResult> {
  const client = getResend()

  if (!client) {
    console.warn(
      `[email] Skipping email to "${to}" — RESEND_API_KEY is not configured. ` +
        "Set this env var to enable email delivery."
    )
    return { success: false, error: "RESEND_API_KEY not configured", skipped: true }
  }

  const MAX_RETRIES = 2
  let lastError = ""

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await client.emails.send({
        from: `ReservasAI <${FROM_EMAIL}>`,
        to,
        subject,
        react,
      })

      if (error) {
        lastError = typeof error === "string" ? error : JSON.stringify(error)
        // Don't retry on validation errors (bad email, etc.)
        if (typeof error === "object" && "statusCode" in error && (error as { statusCode: number }).statusCode < 500) {
          console.error(`[email] Permanent error for "${to}" — subject: "${subject}":`, lastError)
          break
        }
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
      } else {
        console.info(`[email] Sent to "${to}" — subject: "${subject}" — id: ${data?.id}`)
        return { success: true, id: data?.id ?? "" }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  console.error(`[email] DEAD LETTER — failed after ${MAX_RETRIES + 1} attempts — to: "${to}" — subject: "${subject}" — error: ${lastError}`)
  return { success: false, error: lastError }
}

/**
 * Returns true when the Resend client is properly configured.
 * Use this for health checks or to show a warning in the admin UI.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
