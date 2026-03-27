export async function onRequestError() {
  // Placeholder — Next.js instrumentation hook for error tracking (e.g. Sentry)
}

// Validate environment variables at startup (module-level, runs once)
if (process.env.NEXT_RUNTIME === "nodejs") {
  import("@/lib/env").then(({ validateEnv }) => validateEnv())
}
