import { Resend } from "resend"

let resend: Resend

function getResend() {
  if (!resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resend = new Resend(key)
  }
  return resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: `ReservasAI <${FROM_EMAIL}>`,
      to,
      subject,
      react,
    })

    if (error) {
      console.error("Email send error:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email send exception:", error)
    return { success: false, error }
  }
}
