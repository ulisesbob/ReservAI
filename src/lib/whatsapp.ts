export async function sendWhatsAppMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  text: string
): Promise<void> {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

  const send = async (): Promise<Response> => {
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    })
  }

  let res = await send()

  // Retry once on failure
  if (!res.ok) {
    console.error("WhatsApp API error (attempt 1):", await res.text())
    res = await send()
    if (!res.ok) {
      console.error("WhatsApp API error (attempt 2):", await res.text())
    }
  }
}
