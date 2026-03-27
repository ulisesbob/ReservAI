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

interface ReservationReminderProps {
  customerName: string
  restaurantName: string
  date: string
  time: string
  partySize: number
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function ReservationReminderEmail({
  customerName,
  restaurantName,
  date,
  time,
  partySize,
}: ReservationReminderProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Recordatorio: tu reserva en {restaurantName} es mañana a las {time}</Preview>
      <Body style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", background: bg, margin: 0, padding: 0 }}>
        <Container style={{ background: card, borderRadius: "10px", margin: "40px auto", maxWidth: "520px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          {/* Header accent bar */}
          <Section style={{ background: brand, padding: "20px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", margin: 0 }}>
              ReservasAI
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "36px 40px 24px" }}>
            {/* Bell icon + title */}
            <Section style={{ textAlign: "center", marginBottom: "24px" }}>
              <Text style={{ fontSize: "36px", margin: "0 0 4px" }}>🔔</Text>
              <Heading style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>
                Recordatorio de reserva
              </Heading>
              <Text style={{ fontSize: "14px", color: muted, margin: 0 }}>
                Tu mesa en {restaurantName} es mañana
              </Text>
            </Section>

            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 20px" }}>
              Hola {customerName}, te recordamos que tenes una reserva confirmada para mañana.
            </Text>

            {/* Reservation details card */}
            <Section style={{ background: bg, borderRadius: "8px", padding: "20px 24px", marginBottom: "20px" }}>
              <Row>
                <Column style={{ width: "50%", paddingRight: "12px" }}>
                  <Text style={{ fontSize: "11px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                    Fecha
                  </Text>
                  <Text style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    {date}
                  </Text>
                </Column>
                <Column style={{ width: "50%", paddingLeft: "12px" }}>
                  <Text style={{ fontSize: "11px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                    Hora
                  </Text>
                  <Text style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    {time}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
              <Row>
                <Column>
                  <Text style={{ fontSize: "11px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                    Personas
                  </Text>
                  <Text style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    {partySize} {partySize === 1 ? "persona" : "personas"}
                  </Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />
            <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
              Si necesitas cancelar o modificar tu reserva, contacta al restaurante directamente.
              <br />— {restaurantName} vía ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
