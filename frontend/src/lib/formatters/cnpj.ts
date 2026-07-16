const CNPJ_LEN = 14

export function cnpjDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, CNPJ_LEN)
}

/** Máscara progressiva: 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const d = cnpjDigits(value)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function displayCnpj(value?: string | null): string {
  if (!value) return '—'
  const formatted = formatCnpj(value)
  return formatted || '—'
}
