import nodemailer from 'nodemailer'

/**
 * Envoi d'emails transactionnels via SMTP (variables NUXT_SMTP_*, cf.
 * `.env.example`). Sans configuration SMTP, l'envoi est simplement sauté et
 * `sent: false` est renvoyé : l'appelant peut alors proposer un fallback
 * (ex. lien d'invitation à copier manuellement).
 */
export async function sendMail(options: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ sent: boolean }> {
  const { smtp } = useRuntimeConfig()
  if (!smtp?.host) return { sent: false }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: Number(smtp.port) === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
  })

  try {
    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    })
    return { sent: true }
  } catch (err) {
    // L'échec d'envoi ne doit pas faire échouer l'action métier appelante.
    console.error('[mail] envoi échoué :', err)
    return { sent: false }
  }
}
