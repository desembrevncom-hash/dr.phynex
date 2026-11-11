// Public contact details from Site settings → "Thông tin liên hệ". Read by the Contact page and the
// footer through the same helper, so both always show the same values (no shared-client imports).

export type ContactDetails = {
  email?: string | null
  phone?: string | null
  address?: string | null
  hours?: string | null
}

export type ContactRow =
  | { key: 'email'; value: string; href: string }
  | { key: 'phone'; value: string; href: string }
  | { key: 'hours'; value: string }
  | { key: 'address'; value: string }

/** `tel:` link from a written number: keeps digits and one leading "+", drops spaces and dashes. */
export const telHref = (phone: string) => {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  return digits ? `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}` : null
}

/** `mailto:` link only for a plain address (the field is validated as an email in the CMS). */
export const mailtoHref = (email: string) => (/^[^\s@<>"]+@[^\s@<>"]+$/.test(email.trim()) ? `mailto:${email.trim()}` : null)

/** Rows in display order (email, hotline, hours, address); empty fields are left out. */
export function contactRows(details: ContactDetails | null | undefined): ContactRow[] {
  if (!details) return []
  const rows: ContactRow[] = []
  const email = details.email?.trim()
  const mail = email ? mailtoHref(email) : null
  if (email && mail) rows.push({ key: 'email', value: email, href: mail })
  const phone = details.phone?.trim()
  const tel = phone ? telHref(phone) : null
  if (phone && tel) rows.push({ key: 'phone', value: phone, href: tel })
  const hours = details.hours?.trim()
  if (hours) rows.push({ key: 'hours', value: hours })
  const address = details.address?.trim()
  if (address) rows.push({ key: 'address', value: address })
  return rows
}
