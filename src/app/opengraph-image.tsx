import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "ReservasAI — Reservas por WhatsApp con IA"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0C0A09 0%, #1c1917 50%, #0C0A09 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative circles — warm tones */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(5, 150, 105, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(217, 119, 6, 0.06)",
          }}
        />

        {/* Logomark */}
        <div style={{ display: "flex", marginBottom: "32px" }}>
          <svg
            width="80"
            height="90"
            viewBox="0 0 64 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 14C4 6.268 10.268 0 18 0h28c7.732 0 14 6.268 14 14v34c0 7.732-6.268 14-14 14H38l-3.8 8.2a2.5 2.5 0 0 1-4.4 0L26 62H18C10.268 62 4 55.732 4 48V14Z"
              fill="#059669"
            />
            <rect x="12" y="14" width="9" height="9" rx="2" fill="white" />
            <rect x="27.5" y="14" width="9" height="9" rx="2" fill="white" />
            <rect x="43" y="14" width="9" height="9" rx="2" fill="white" />
            <rect x="12" y="32" width="9" height="9" rx="2" fill="white" />
            <rect x="27.5" y="32" width="9" height="9" rx="2" fill="white" />
            <path
              d="M43.5 37.5l3.5 3.5 6-6.5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#ffffff", letterSpacing: "-2px" }}>
            Reservas
          </span>
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#059669", letterSpacing: "-2px" }}>
            AI
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.6)",
            marginTop: "0",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Reservas por WhatsApp con IA.
          Sin apps. Sin formularios. 24/7.
        </p>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "40px",
            padding: "12px 24px",
            background: "rgba(5, 150, 105, 0.12)",
            borderRadius: "9999px",
            border: "1px solid rgba(5, 150, 105, 0.25)",
          }}
        >
          <span style={{ fontSize: "18px", color: "#059669", fontWeight: 600 }}>
            14 dias gratis
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
