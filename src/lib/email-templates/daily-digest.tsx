import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components"

export interface DailyDigestProps {
  restaurantName: string
  date: string
  newReservations: number
  cancellations: number
  noShows: number
  totalGuests: number
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function DailyDigestEmail({
  restaurantName,
  date,
  newReservations,
  cancellations,
  noShows,
  totalGuests,
}: DailyDigestProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        {`Resumen de ayer para ${restaurantName}: ${newReservations} reservas, ${cancellations} cancelaciones`}
      </Preview>
      <Body
        style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          background: bg,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            background: card,
            borderRadius: "10px",
            margin: "40px auto",
            maxWidth: "520px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <Section style={{ background: brand, padding: "20px 40px" }}>
            <Text
              style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", margin: 0 }}
            >
              ReservasAI
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "36px 40px 24px" }}>
            <Section style={{ textAlign: "center", marginBottom: "24px" }}>
              <Text style={{ fontSize: "36px", margin: "0 0 4px" }}>📊</Text>
              <Heading
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                Resumen diario
              </Heading>
              <Text style={{ fontSize: "14px", color: muted, margin: 0 }}>
                {restaurantName} — {date}
              </Text>
            </Section>

            {/* Stats grid */}
            <Section
              style={{
                background: bg,
                borderRadius: "8px",
                padding: "20px 24px",
                marginBottom: "20px",
              }}
            >
              <Row>
                <Column style={{ width: "50%", paddingRight: "12px" }}>
                  <Text
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: "0 0 4px",
                    }}
                  >
                    Nuevas reservas
                  </Text>
                  <Text
                    style={{ fontSize: "28px", fontWeight: "700", color: "#10b981", margin: 0 }}
                  >
                    {newReservations}
                  </Text>
                </Column>
                <Column style={{ width: "50%", paddingLeft: "12px" }}>
                  <Text
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: "0 0 4px",
                    }}
                  >
                    Comensales totales
                  </Text>
                  <Text
                    style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 }}
                  >
                    {totalGuests}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
              <Row>
                <Column style={{ width: "50%", paddingRight: "12px" }}>
                  <Text
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: "0 0 4px",
                    }}
                  >
                    Cancelaciones
                  </Text>
                  <Text
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: cancellations > 0 ? "#f59e0b" : "#111827",
                      margin: 0,
                    }}
                  >
                    {cancellations}
                  </Text>
                </Column>
                <Column style={{ width: "50%", paddingLeft: "12px" }}>
                  <Text
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: "0 0 4px",
                    }}
                  >
                    No-shows
                  </Text>
                  <Text
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: noShows > 0 ? "#ef4444" : "#111827",
                      margin: 0,
                    }}
                  >
                    {noShows}
                  </Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />
            <Text
              style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}
            >
              Este es tu resumen automatico de ayer.
              <br />— {restaurantName} vía ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
