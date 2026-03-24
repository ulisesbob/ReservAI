import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components"

interface PasswordResetEmailProps {
  name: string
  resetUrl: string
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña de ReservasAI</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Restablecer contraseña
          </Heading>
          <Text>Hola {name},</Text>
          <Text>
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Hace clic en el siguiente enlace para crear una nueva contraseña:
          </Text>
          <Link
            href={resetUrl}
            style={{
              display: "inline-block",
              background: "#10b981",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            Restablecer contraseña
          </Link>
          <Text style={{ color: "#71717a", fontSize: "14px" }}>
            Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — El equipo de ReservasAI
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
