const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0)
}

/** Máscara de input: dígitos representam centavos (123 → R$ 1,23). */
export function parseCurrencyMaskInput(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  return Number.parseInt(digits, 10) / 100
}

export function formatCurrencyMaskInput(value: number): string {
  return formatBRL(value)
}

export function parseBRLInput(raw: string): number {
  const n = raw.replace(/\s/g, '').replace(/[^\d,-]/g, '').replace(',', '.')
  const v = Number.parseFloat(n)
  return Number.isFinite(v) ? v : 0
}

export function parseSearchAmount(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const normalized = trimmed.replace(/\s/g, '').replace(/^[Rr]\$/, '').replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return undefined
  const v = Number.parseFloat(normalized)
  return Number.isFinite(v) ? v : undefined
}

export function looksLikeAmountSearch(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  return /^[\d\s.,R$r$-]+$/.test(trimmed)
}

export function amountMatchesSearch(amount: number, search: string): boolean {
  const trimmed = search.trim()
  if (!trimmed) return true

  const parsed = parseSearchAmount(trimmed)
  if (parsed !== undefined && Math.abs(amount - parsed) < 0.005) return true

  const q = trimmed.toLowerCase()
  if (formatBRL(amount).toLowerCase().includes(q)) return true

  if (looksLikeAmountSearch(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length >= 1) {
      const amountDigits = Math.abs(amount).toFixed(2).replace(/\D/g, '')
      if (amountDigits.includes(digits)) return true
    }
  }

  return false
}
