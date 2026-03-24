import {
  Body, Container, Head, Heading, Html, Link, Preview, Text,
} from "@react-email/components"

interface TeamInviteEmailProps {
  employeeName: string
  restaurantName: string
  loginUrl: string
}

export function TeamInviteEmail({ employeeName, restaurantName, loginUrl }: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Fuiste agregado al equipo de {restaurantName}</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Te invitaron a ReservasAI
          </Heading>
          <Text>Hola {employeeName},</Text>
          <Text>
            Fuiste agregado al equipo de <strong>{restaurantName}</strong> en ReservasAI.
            Ya podés acceder al panel para gestionar las reservas del restaurante.
          </Text>
          <Link
            href={loginUrl}
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
            Iniciar sesión
          </Link>
          <Text style={{ color: "#71717a", fontSize: "14px" }}>
            Usá el email y contraseña que te compartió tu administrador para ingresar.
          </Text>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — El equipo de ReservasAI
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
