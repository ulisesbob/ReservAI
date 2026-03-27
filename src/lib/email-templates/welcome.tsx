import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface WelcomeEmailProps {
  name: string
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Bienvenido a ReservasAI — tu prueba gratuita ya comenzó</Preview>
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
              Bienvenido, {name}
            </Heading>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 16px" }}>
              Tu cuenta fue creada exitosamente. Tenes <strong>14 dias de prueba gratuita</strong> para
              configurar tu restaurante y empezar a recibir reservas automaticas.
            </Text>

            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

            <Text style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 12px" }}>
              Proximos pasos para comenzar:
            </Text>

            <Section style={{ background: bg, borderRadius: "8px", padding: "16px 20px" }}>
              <Text style={{ fontSize: "14px", color: "#374151", margin: "6px 0", lineHeight: "1.5" }}>
                <span style={{ color: brand, fontWeight: "700" }}>1.</span> Configura los horarios y mesas de tu restaurante
              </Text>
              <Text style={{ fontSize: "14px", color: "#374151", margin: "6px 0", lineHeight: "1.5" }}>
                <span style={{ color: brand, fontWeight: "700" }}>2.</span> Agrega informacion para el asistente de IA
              </Text>
              <Text style={{ fontSize: "14px", color: "#374151", margin: "6px 0", lineHeight: "1.5" }}>
                <span style={{ color: brand, fontWeight: "700" }}>3.</span> Conecta tu WhatsApp Business
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "16px 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />
            <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
              Si tenes alguna duda, respondé este email y te ayudamos.
              <br />— El equipo de ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
