import type { BudgetResumo } from '@/types/resumo'

const ZERO_HIGHLIGHT = (title: string) => ({
  title,
  planned: 0,
  actual: 0,
  variationPct: 0,
})

/** Estrutura fixa do resumo — exibida mesmo sem lançamentos ou quando a API falha. */
export function emptyBudgetResumo(year = new Date().getFullYear()): BudgetResumo {
  return {
    year,
    sections: [
      { id: 'receitas', title: 'Receitas', rows: [] },
      { id: 'despesas', title: 'Despesas', rows: [] },
      { id: 'capex', title: 'Capex/Imobilizado', rows: [] },
    ],
    operationalSurplus: ZERO_HIGHLIGHT('Superávit/Déficit - Operacional'),
    netSurplus: ZERO_HIGHLIGHT('Superávit/Déficit'),
  }
}

export function mergeBudgetResumo(partial: BudgetResumo, year: number): BudgetResumo {
  const shell = emptyBudgetResumo(year)
  const byId = new Map(partial.sections.map((s) => [s.id, s]))
  return {
    year: partial.year || year,
    sections: shell.sections.map((s) => byId.get(s.id) ?? s),
    operationalSurplus: partial.operationalSurplus ?? shell.operationalSurplus,
    netSurplus: partial.netSurplus ?? shell.netSurplus,
  }
}
