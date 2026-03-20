import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components"

interface ReservationConfirmationProps {
  customerName: string
  restaurantName: string
  date: string
  time: string
  partySize: number
}

export function ReservationConfirmationEmail({
  customerName,
  restaurantName,
  date,
  time,
  partySize,
}: ReservationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu reserva en {restaurantName}</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Reserva confirmada
          </Heading>
          <Text>Hola {customerName},</Text>
          <Text>Tu reserva en <strong>{restaurantName}</strong> fue confirmada:</Text>
          <Text style={{ background: "#f4f4f5", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
            Fecha: {date}<br />
            Hora: {time}<br />
            Personas: {partySize}
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            Si necesitas modificar o cancelar tu reserva, contacta al restaurante directamente.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
