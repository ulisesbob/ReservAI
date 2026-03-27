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

interface PaymentReceiptProps {
  adminName: string
  restaurantName: string
  plan: string
  amount: string
  currency: string
  date: string
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function PaymentReceiptEmail({
  adminName,
  restaurantName,
  plan,
  amount,
  currency,
  date,
}: PaymentReceiptProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Recibo de pago — {restaurantName} — {currency} {amount}</Preview>
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
            <Heading style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 12px" }}>
              Recibo de pago
            </Heading>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 20px" }}>
              Hola {adminName}, confirmamos que recibimos tu pago para{" "}
              <strong>{restaurantName}</strong>. A continuacion el detalle:
            </Text>

            {/* Receipt details */}
            <Section style={{ background: bg, borderRadius: "8px", padding: "20px 24px", marginBottom: "20px" }}>
              <Row style={{ marginBottom: "12px" }}>
                <Column style={{ width: "40%" }}>
                  <Text style={{ fontSize: "12px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    Plan
                  </Text>
                </Column>
                <Column style={{ width: "60%" }}>
                  <Text style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    {plan}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />
              <Row style={{ marginBottom: "12px" }}>
                <Column style={{ width: "40%" }}>
                  <Text style={{ fontSize: "12px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    Monto
                  </Text>
                </Column>
                <Column style={{ width: "60%" }}>
                  <Text style={{ fontSize: "14px", fontWeight: "600", color: brand, margin: 0 }}>
                    {currency} {amount}
                  </Text>
                </Column>
              </Row>
              <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />
              <Row>
                <Column style={{ width: "40%" }}>
                  <Text style={{ fontSize: "12px", fontWeight: "600", color: muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    Fecha
                  </Text>
                </Column>
                <Column style={{ width: "60%" }}>
                  <Text style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    {date}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: 0 }}>
              Tu suscripcion esta activa. Podes gestionar tu plan desde la seccion de facturacion en el panel.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0 16px" }} />
            <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
              Guarda este email como comprobante de pago.
              <br />— El equipo de ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
