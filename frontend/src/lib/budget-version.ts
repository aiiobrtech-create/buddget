import type { Budget } from '@/types/entities'

/** Versão preferida para leitura: publicada → rascunho → primeira. */
export function pickBudgetVersionId(budget: Budget): string | undefined {
  const published = budget.versions.find((v) => v.status === 'published')
  if (published) return published.id
  const draft = budget.versions.find((v) => v.status === 'draft')
  if (draft) return draft.id
  return budget.versions[0]?.id
}

export function buildBudgetFilterOptions(budgets: Budget[], yearFilter?: number): { value: string; label: string }[] {
  return budgets
    .filter((b) => (yearFilter ? b.year === yearFilter : true))
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name, 'pt-BR'))
    .map((b) => ({
      value: b.id,
      label: `${b.year} — ${b.name}`,
    }))
}
