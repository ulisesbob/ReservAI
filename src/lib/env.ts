/**
 * Validates that all critical environment variables are set.
 * Call this in instrumentation.ts or at app startup.
 */
export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "ENCRYPTION_KEY",
  ]

  const optional = [
    "OPENAI_API_KEY",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "MERCADOPAGO_ACCESS_TOKEN",
    "MERCADOPAGO_WEBHOOK_SECRET",
    "CRON_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "NEXT_PUBLIC_APP_URL",
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }

  const missingOptional = optional.filter((key) => !process.env[key])
  if (missingOptional.length > 0) {
    console.warn(
      `[env] Optional variables not set (some features disabled): ${missingOptional.join(", ")}`
    )
  }
}
