import { randomBytes } from "crypto"
import { google } from "googleapis"
import { safeDecrypt } from "@/lib/encryption"

// Shape expected from Prisma for calendar operations
export interface CalendarRestaurant {
  name: string
  timezone: string
  googleCalendarToken: string | null
  googleCalendarId: string | null
  googleCalendarEnabled: boolean
}

export interface CalendarReservation {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  dateTime: Date
  partySize: number
  status: string
  // optional special requests field — not in schema yet, safe to be undefined
  specialRequests?: string | null
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Calendar OAuth credentials are not configured")
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function buildOAuth2WithToken(encryptedToken: string) {
  const oauth2Client = getOAuth2Client()
  const refreshToken = safeDecrypt(encryptedToken)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

function buildEventBody(reservation: CalendarReservation, restaurantName: string) {
  const startTime = reservation.dateTime
  // Default event duration: 2 hours
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000)

  const descriptionParts = [
    `Cliente: ${reservation.customerName}`,
    `Telefono: ${reservation.customerPhone}`,
    `Personas: ${reservation.partySize}`,
  ]

  if (reservation.customerEmail) {
    descriptionParts.push(`Email: ${reservation.customerEmail}`)
  }

  if (reservation.specialRequests) {
    descriptionParts.push(`Notas: ${reservation.specialRequests}`)
  }

  descriptionParts.push(`\nID de reserva: ${reservation.id}`)
  descriptionParts.push(`Gestionado por ReservasAI`)

  return {
    summary: `Reserva — ${reservation.customerName} (${reservation.partySize} pax)`,
    description: descriptionParts.join("\n"),
    location: restaurantName,
    start: {
      dateTime: startTime.toISOString(),
    },
    end: {
      dateTime: endTime.toISOString(),
    },
    // Store reservation ID so we can update/delete later
    extendedProperties: {
      private: {
        reservasaiReservationId: reservation.id,
      },
    },
  }
}

/**
 * Creates a Google Calendar event for a new reservation.
 * Returns the created event ID, or null on failure.
 */
export async function createCalendarEvent(
  reservation: CalendarReservation,
  restaurant: CalendarRestaurant
): Promise<string | null> {
  if (!restaurant.googleCalendarEnabled || !restaurant.googleCalendarToken) {
    return null
  }

  try {
    const auth = buildOAuth2WithToken(restaurant.googleCalendarToken)
    const calendar = google.calendar({ version: "v3", auth })
    const calendarId = restaurant.googleCalendarId || "primary"

    const event = await calendar.events.insert({
      calendarId,
      requestBody: buildEventBody(reservation, restaurant.name),
    })

    return event.data.id ?? null
  } catch (err) {
    console.error("[GoogleCalendar] createCalendarEvent failed:", err)
    return null
  }
}

/**
 * Finds and updates the Google Calendar event for a reservation.
 * Matches by the extendedProperty reservasaiReservationId.
 */
export async function updateCalendarEvent(
  reservation: CalendarReservation,
  restaurant: CalendarRestaurant
): Promise<void> {
  if (!restaurant.googleCalendarEnabled || !restaurant.googleCalendarToken) {
    return
  }

  try {
    const auth = buildOAuth2WithToken(restaurant.googleCalendarToken)
    const calendar = google.calendar({ version: "v3", auth })
    const calendarId = restaurant.googleCalendarId || "primary"

    // Search for the event by private extended property
    const searchResult = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`reservasaiReservationId=${reservation.id}`],
      maxResults: 1,
    })

    const existingEvent = searchResult.data.items?.[0]
    if (!existingEvent?.id) {
      // Event not found — create it instead
      await createCalendarEvent(reservation, restaurant)
      return
    }

    await calendar.events.update({
      calendarId,
      eventId: existingEvent.id,
      requestBody: buildEventBody(reservation, restaurant.name),
    })
  } catch (err) {
    console.error("[GoogleCalendar] updateCalendarEvent failed:", err)
  }
}

/**
 * Finds and deletes the Google Calendar event for a reservation.
 */
export async function deleteCalendarEvent(
  reservation: CalendarReservation,
  restaurant: CalendarRestaurant
): Promise<void> {
  if (!restaurant.googleCalendarEnabled || !restaurant.googleCalendarToken) {
    return
  }

  try {
    const auth = buildOAuth2WithToken(restaurant.googleCalendarToken)
    const calendar = google.calendar({ version: "v3", auth })
    const calendarId = restaurant.googleCalendarId || "primary"

    const searchResult = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`reservasaiReservationId=${reservation.id}`],
      maxResults: 1,
    })

    const existingEvent = searchResult.data.items?.[0]
    if (!existingEvent?.id) return

    await calendar.events.delete({
      calendarId,
      eventId: existingEvent.id,
    })
  } catch (err) {
    console.error("[GoogleCalendar] deleteCalendarEvent failed:", err)
  }
}

/**
 * Lists all calendars for the authenticated user.
 * Used in the settings UI to let the restaurant pick a calendar.
 */
export async function listCalendars(
  encryptedToken: string
): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  try {
    const auth = buildOAuth2WithToken(encryptedToken)
    const calendar = google.calendar({ version: "v3", auth })

    const result = await calendar.calendarList.list()
    return (result.data.items ?? []).map((c) => ({
      id: c.id ?? "",
      summary: c.summary ?? c.id ?? "",
      primary: !!c.primary,
    }))
  } catch (err) {
    console.error("[GoogleCalendar] listCalendars failed:", err)
    return []
  }
}

/**
 * Returns the Google OAuth consent screen URL and a random CSRF state value.
 * The caller must store the state in an HttpOnly cookie and validate it in the callback.
 */
export function getAuthUrl(): { url: string; state: string } {
  const oauth2Client = getOAuth2Client()
  const state = randomBytes(32).toString("hex")
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state,
  })
  return { url, state }
}

/**
 * Exchanges an auth code for tokens.
 * Returns the encrypted refresh token to be stored.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned — user may have already authorized. Re-authorize with prompt=consent.")
  }

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? "",
  }
}
