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

interface PasswordResetEmailProps {
  name: string
  resetUrl: string
}

const brand = "#10b981"
const muted = "#6b7280"
const bg = "#f9fafb"
const card = "#ffffff"

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Restablece tu contraseña de ReservasAI — el enlace expira en 1 hora</Preview>
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
              Restablecer contraseña
            </Heading>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 8px" }}>
              Hola {name},
            </Text>
            <Text style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", margin: "0 0 24px" }}>
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.
              Hace clic en el boton de abajo para crear una nueva contraseña:
            </Text>

            <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
              <Button
                href={resetUrl}
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
                Restablecer contraseña
              </Button>
            </Section>

            <Section style={{ background: bg, borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
              <Text style={{ fontSize: "12px", color: muted, margin: 0, wordBreak: "break-all" }}>
                Si el boton no funciona, copia y pega este enlace en tu navegador:
                <br />
                <span style={{ color: brand }}>{resetUrl}</span>
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 28px" }}>
            <Hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />
            <Text style={{ fontSize: "13px", color: muted, margin: 0, lineHeight: "1.5" }}>
              Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este email — tu contraseña no fue modificada.
              <br />— El equipo de ReservasAI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
