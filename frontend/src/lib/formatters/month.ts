import type { SelectOption } from '@/components/ui/Select'

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

const MONTH_SHORT_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

export function formatMonthLabel(month: number): string {
  const index = Math.min(12, Math.max(1, Math.round(month))) - 1
  return MONTH_NAMES_PT[index] ?? String(month)
}

export function formatMonthShort(month: number): string {
  const index = Math.min(12, Math.max(1, Math.round(month))) - 1
  return MONTH_SHORT_PT[index] ?? String(month)
}

export const MONTH_SELECT_OPTIONS: SelectOption[] = MONTH_NAMES_PT.map((label, index) => ({
  value: String(index + 1),
  label,
}))

export const PLANNING_PERIOD_ANNUAL = 'annual'

export const PLANNING_PERIOD_SELECT_OPTIONS: SelectOption[] = [
  ...MONTH_SELECT_OPTIONS,
  { value: PLANNING_PERIOD_ANNUAL, label: 'Anual (rateio em 12 meses)' },
]

export function isAnnualPlanningPeriod(period: string): boolean {
  return period === PLANNING_PERIOD_ANNUAL
}

/** Divide valor anual em parcelas mensais; centavos extras nos primeiros meses. */
export function splitAnnualToMonthlyAmounts(total: number, months = 12): number[] {
  if (months <= 0) return []
  const totalCents = Math.round((Number.isFinite(total) ? total : 0) * 100)
  const baseCents = Math.floor(totalCents / months)
  const remainder = totalCents % months
  return Array.from({ length: months }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100)
}
