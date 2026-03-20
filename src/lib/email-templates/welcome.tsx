import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface WelcomeEmailProps {
  name: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenido a ReservasAI</Preview>
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f5" }}>
        <Container style={{ background: "#ffffff", padding: "40px", borderRadius: "8px", margin: "40px auto", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
            Bienvenido a ReservasAI
          </Heading>
          <Text>Hola {name},</Text>
          <Text>
            Tu cuenta fue creada exitosamente. Tenes 14 dias de prueba gratuita
            para configurar tu restaurante y empezar a recibir reservas.
          </Text>
          <Section style={{ marginTop: "24px" }}>
            <Text style={{ fontWeight: "bold" }}>Proximos pasos:</Text>
            <Text>1. Configura los horarios de tu restaurante</Text>
            <Text>2. Agrega la informacion para el asistente de IA</Text>
            <Text>3. Conecta tu WhatsApp Business</Text>
          </Section>
          <Text style={{ marginTop: "24px", color: "#71717a", fontSize: "14px" }}>
            — El equipo de ReservasAI
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
