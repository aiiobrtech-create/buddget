import { formatBRL } from '@/lib/formatters/currency'

export type NatureSectionId = 'receitas' | 'despesas' | 'capex'

export function isReceitasSaldoFavoravel(
  planned: number,
  actual: number,
  natureSection?: NatureSectionId,
): boolean {
  return natureSection === 'receitas' && actual > planned
}

export function isSaldoNegativoVermelho(
  balance: number,
  planned: number,
  actual: number,
  natureSection?: NatureSectionId,
): boolean {
  return balance < 0 && !isReceitasSaldoFavoravel(planned, actual, natureSection)
}

export function formatSaldoDisplay(
  balance: number,
  planned: number,
  actual: number,
  natureSection?: NatureSectionId,
): string {
  if (isReceitasSaldoFavoravel(planned, actual, natureSection)) {
    return formatBRL(Math.abs(balance))
  }
  return formatBRL(balance)
}

export function saldoToneClass(
  balance: number,
  planned: number,
  actual: number,
  natureSection?: NatureSectionId,
): string | undefined {
  if (isReceitasSaldoFavoravel(planned, actual, natureSection)) return 'text-emerald-400'
  if (isSaldoNegativoVermelho(balance, planned, actual, natureSection)) return 'text-rose-400'
  return undefined
}
