import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from "@react-email/components"

interface PaymentReceiptProps {
  adminName: string
  restaurantName: string
  plan: string
  amount: string
  currency: string
  date: string
}

export function PaymentReceiptEmail({
  adminName, restaurantName, plan, amount, currency, date,
}: PaymentReceiptProps) {
  return (
    <Html>
      <Head />
      <Preview>Recibo de pago — ReservasAI</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Recibo de pago
          </Heading>
          <Text>Hola {adminName},</Text>
          <Text>
            Recibimos tu pago para <strong>{restaurantName}</strong>:
          </Text>
          <Text style={{ background: "#f4f4f5", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
            Plan: {plan}<br />
            Monto: {currency} {amount}<br />
            Fecha: {date}
          </Text>
          <Text style={{ marginTop: "16px" }}>
            Tu suscripción está activa. Podés gestionar tu plan desde la sección de facturación.
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — El equipo de ReservasAI
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
