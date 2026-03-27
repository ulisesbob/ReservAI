import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface TeamInviteEmailProps {
  employeeName: string
  restaurantName: string
  loginUrl: string
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function TeamInviteEmail({ employeeName, restaurantName, loginUrl }: TeamInviteEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Fuiste agregado al equipo de {restaurantName} en ReservasAI</Preview>
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
              Te invitaron al equipo
            </Heading>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 8px" }}>
              Hola {employeeName},
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 24px" }}>
              Fuiste agregado al equipo de <strong>{restaurantName}</strong> en ReservasAI.
              Ya podes acceder al panel para gestionar reservas.
            </Text>

            <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
              <Button
                href={loginUrl}
                style={{
                  background: brand,
                  borderRadius: "8px",
                  color: "#ffffff",
                  display: "inline-block",
                  fontSize: "15px",
                  fontWeight: "600",
                  padding: "14px 32px",
                  textDecoration: "none",
                }}
              >
                Iniciar sesion
              </Button>
            </Section>

            <Section style={{ background: bg, borderRadius: "8px", padding: "14px 16px" }}>
              <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
                Usa el email y la contraseña que te compartio tu administrador para ingresar.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
            <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
              Si no esperabas esta invitacion, podes ignorar este email.
              <br />— El equipo de ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
