import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

/**
 * Outgoing email over SMTP (works with Resend, Postmark, Amazon SES, Brevo... via their SMTP relay).
 * Enabled only when SMTP_HOST is set; without it Payload logs emails to the console and the form
 * notification hook does nothing.
 */
export const emailEnabled = () => Boolean(process.env.SMTP_HOST)

export function emailAdapter(): Promise<EmailAdapter> | undefined {
  const host = process.env.SMTP_HOST
  if (!host) return undefined

  const from = process.env.EMAIL_FROM_ADDRESS
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!from || !user || !pass) throw new Error('SMTP_HOST is set but EMAIL_FROM_ADDRESS / SMTP_USER / SMTP_PASS are missing.')

  const port = Number(process.env.SMTP_PORT || 587)
  return nodemailerAdapter({
    defaultFromAddress: from,
    defaultFromName: process.env.EMAIL_FROM_NAME || 'Dr.PhynEX website',
    // Verifying opens an SMTP connection on every cold start; failures surface when sending instead.
    skipVerify: true,
    transportOptions: { host, port, secure: port === 465, auth: { user, pass } },
  })
}
