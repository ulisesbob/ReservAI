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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.08)",
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
            background: "rgba(99, 102, 241, 0.06)",
          }}
        />

        {/* Logo */}
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
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#10b981", letterSpacing: "-2px" }}>
            AI
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.7)",
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
            background: "rgba(16, 185, 129, 0.12)",
            borderRadius: "9999px",
            border: "1px solid rgba(16, 185, 129, 0.2)",
          }}
        >
          <span style={{ fontSize: "18px", color: "#10b981", fontWeight: 600 }}>
            14 dias gratis
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
