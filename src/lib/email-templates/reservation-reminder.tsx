import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from "@react-email/components"

interface ReservationReminderProps {
  customerName: string
  restaurantName: string
  date: string
  time: string
  partySize: number
}

export function ReservationReminderEmail({
  customerName, restaurantName, date, time, partySize,
}: ReservationReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Recordatorio: tu reserva en {restaurantName} es mañana</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Recordatorio de reserva
          </Heading>
          <Text>Hola {customerName},</Text>
          <Text>
            Te recordamos que tenés una reserva en <strong>{restaurantName}</strong> para mañana:
          </Text>
          <Text style={{ background: "#f4f4f5", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
            Fecha: {date}<br />
            Hora: {time}<br />
            Personas: {partySize}
          </Text>
          <Text style={{ marginTop: "16px" }}>
            Si necesitás cancelar o modificar tu reserva, contactá al restaurante directamente.
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — {restaurantName} vía ReservasAI
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
