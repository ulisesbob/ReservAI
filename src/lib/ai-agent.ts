import OpenAI from "openai"

interface AgentMessage {
  role: "user" | "assistant"
  content: string
}

interface RestaurantConfig {
  name: string
  timezone: string
  knowledgeBase: string | null
  operatingHours: Record<string, unknown> | null
  maxPartySize: number
  maxCapacity: number
  openaiApiKey: string | null
}

interface ReservationData {
  nombre: string
  fecha: string // YYYY-MM-DD
  hora: string // HH:mm
  personas: number
  contacto: string
}

interface AgentResponse {
  text: string
  reservation: ReservationData | null
}

export type { AgentMessage, RestaurantConfig, ReservationData, AgentResponse }

export async function processMessage(
  restaurant: RestaurantConfig,
  history: AgentMessage[],
  newMessage: string
): Promise<AgentResponse> {
  const apiKey = restaurant.openaiApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("No OpenAI API key configured")
  }

  const openai = new OpenAI({ apiKey })

  const now = new Date().toLocaleString("es-AR", {
    timeZone: restaurant.timezone,
  })

  const systemPrompt = buildSystemPrompt(restaurant, now)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: newMessage },
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content || ""

    const reservation = extractReservation(responseText)

    return { text: responseText, reservation }
  } catch (error) {
    console.error("OpenAI API error:", error)
    return {
      text: "Disculpá, estoy teniendo problemas técnicos en este momento. ¿Podés intentar de nuevo en unos minutos?",
      reservation: null,
    }
  }
}

function buildSystemPrompt(
  restaurant: RestaurantConfig,
  now: string
): string {
  const hours = restaurant.operatingHours
    ? JSON.stringify(restaurant.operatingHours, null, 2)
    : "No configurados"

  return `Sos el asistente de reservas de ${restaurant.name}.
Zona horaria: ${restaurant.timezone}
Fecha y hora actual: ${now}

Informacion del restaurante:
${restaurant.knowledgeBase || "No hay información adicional."}

Horarios de atencion:
${hours}

Capacidad maxima por reserva: ${restaurant.maxPartySize} personas

Tu trabajo es ayudar al cliente a hacer una reserva.
Necesitas obtener: nombre, fecha, hora, cantidad de personas,
y un email o telefono de contacto.

Cuando tengas todos los datos, responde con un JSON al final del mensaje:
{"reserva": {"nombre": "...", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "personas": N, "contacto": "..."}}

Validaciones:
- No aceptar reservas en fechas/horas pasadas
- No aceptar reservas fuera del horario de atencion
- No aceptar mas de ${restaurant.maxPartySize} personas
- Si algo no es posible, sugerir alternativas amablemente
- Ser amable, breve y conversacional`
}

function extractReservation(text: string): ReservationData | null {
  // Look for JSON pattern in the response — handle whitespace and newlines
  const jsonMatch = text.match(
    /\{\s*"reserva"\s*:\s*\{[^}]*\}\s*\}/
  )
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const r = parsed.reserva
    if (r && r.nombre && r.fecha && r.hora && r.personas && r.contacto) {
      return {
        nombre: String(r.nombre),
        fecha: String(r.fecha),
        hora: String(r.hora),
        personas: Number(r.personas),
        contacto: String(r.contacto),
      }
    }
    return null
  } catch {
    return null
  }
}
