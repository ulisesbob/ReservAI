"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Algo salió mal</h2>
          <p className="text-gray-500">Estamos trabajando en solucionarlo.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
