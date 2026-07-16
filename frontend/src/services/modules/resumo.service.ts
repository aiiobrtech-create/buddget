import { env } from '@/lib/env'
import { apiGetData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { mockBudgetResumo } from '@/mocks/budget-resumo'
import { emptyBudgetResumo, mergeBudgetResumo } from '@/lib/resumo-empty'
import type { BudgetResumo } from '@/types/resumo'

function normalizeFilterList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered : undefined
}

function serializeResumoQuery(query: {
  year?: number
  yearIds?: string[]
  monthIds?: string[]
  companyIds?: string[]
  classIds?: string[]
  costCenterIds?: string[]
  categoryIds?: string[]
  budgetIds?: string[]
  versionId?: string
}): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {}
  if (query.year !== undefined) out.year = query.year
  if (query.versionId) out.versionId = query.versionId
  const yearIds = normalizeFilterList(query.yearIds)
  const monthIds = normalizeFilterList(query.monthIds)
  const companyIds = normalizeFilterList(query.companyIds)
  const budgetIds = normalizeFilterList(query.budgetIds)
  const classIds = normalizeFilterList(query.classIds)
  const costCenterIds = normalizeFilterList(query.costCenterIds)
  const categoryIds = normalizeFilterList(query.categoryIds)
  if (yearIds) out.yearIds = yearIds.join(',')
  if (monthIds) out.monthIds = monthIds.join(',')
  if (companyIds) out.companyIds = companyIds.join(',')
  if (budgetIds) out.budgetIds = budgetIds.join(',')
  if (classIds) out.classIds = classIds.join(',')
  if (costCenterIds) out.costCenterIds = costCenterIds.join(',')
  if (categoryIds) out.categoryIds = categoryIds.join(',')
  return out
}

function applyMockFilterFactor(
  data: BudgetResumo,
  query?: {
    companyIds?: string[]
    classIds?: string[]
    costCenterIds?: string[]
    categoryIds?: string[]
    monthIds?: string[]
    yearIds?: string[]
  },
): BudgetResumo {
  let factor = 1
  if (query?.companyIds?.length && !query.companyIds.includes('all')) factor *= 0.45
  if (query?.classIds?.length && !query.classIds.includes('all')) factor *= 0.75
  if (query?.costCenterIds?.length && !query.costCenterIds.includes('all')) factor *= 0.6
  if (query?.categoryIds?.length && !query.categoryIds.includes('all')) factor *= 0.3
  if (query?.monthIds?.length && !query.monthIds.includes('all')) {
    const month = Number(query.monthIds.find((id) => id !== 'all') ?? 1)
    factor *= month / 12
  }
  if (query?.yearIds?.length && !query.yearIds.includes('all') && !query.yearIds.includes('2026')) factor *= 1.15

  if (factor === 1) return data

  const scaleLine = <T extends { planned: number; actual: number; variationPct: number; balance?: number }>(row: T): T => ({
    ...row,
    planned: row.planned * factor,
    actual: row.actual * factor,
    balance: row.planned * factor - row.actual * factor,
    variationPct: row.planned * factor > 0 ? (row.actual * factor / (row.planned * factor)) * 100 : 0,
  })

  return {
    ...data,
    sections: data.sections.map((section) => ({
      ...section,
      rows: section.rows.map(scaleLine),
    })),
    operationalSurplus: scaleLine(data.operationalSurplus),
    netSurplus: scaleLine(data.netSurplus),
  }
}

export const resumoService = {
  async getBudgetResumo(
    query?: {
      year?: number
      yearIds?: string[]
      monthIds?: string[]
      companyIds?: string[]
      classIds?: string[]
      costCenterIds?: string[]
      categoryIds?: string[]
      budgetIds?: string[]
      versionId?: string
    },
    signal?: AbortSignal,
  ): Promise<BudgetResumo> {
    const year = query?.year ?? new Date().getFullYear()

    if (env.useMockApi) {
      await mockDelay(200)
      const data = structuredClone({ ...mockBudgetResumo, year })
      return applyMockFilterFactor(data, query)
    }

    try {
      const raw = await apiGetData<BudgetResumo>('/resumo/orcamento', serializeResumoQuery({ ...query, year }), signal)
      return mergeBudgetResumo(raw, year)
    } catch {
      return emptyBudgetResumo(year)
    }
  },
}
