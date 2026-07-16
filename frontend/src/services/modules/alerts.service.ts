import { env } from '@/lib/env'
import { apiGetData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { mockExecutiveDashboard } from '@/mocks/fixtures'
import type { ExecutiveAlert } from '@/types/dashboard'

function normalizeFilterList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered : undefined
}

function serializeAlertsQuery(query?: {
  year?: number
  yearIds?: string[]
  monthIds?: string[]
  companyIds?: string[]
  classIds?: string[]
  ccIds?: string[]
  categoryIds?: string[]
  budgetIds?: string[]
  versionId?: string
}): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {}
  if (query?.year !== undefined) out.year = query.year
  if (query?.versionId) out.versionId = query.versionId
  const yearIds = normalizeFilterList(query?.yearIds)
  const monthIds = normalizeFilterList(query?.monthIds)
  const companyIds = normalizeFilterList(query?.companyIds)
  const budgetIds = normalizeFilterList(query?.budgetIds)
  const classIds = normalizeFilterList(query?.classIds)
  const costCenterIds = normalizeFilterList(query?.ccIds)
  const categoryIds = normalizeFilterList(query?.categoryIds)
  if (yearIds) out.yearIds = yearIds.join(',')
  if (monthIds) out.monthIds = monthIds.join(',')
  if (companyIds) out.companyIds = companyIds.join(',')
  if (budgetIds) out.budgetIds = budgetIds.join(',')
  if (classIds) out.classIds = classIds.join(',')
  if (costCenterIds) out.costCenterIds = costCenterIds.join(',')
  if (categoryIds) out.categoryIds = categoryIds.join(',')
  return out
}

export const alertsService = {
  async list(
    query?: {
      year?: number
      yearIds?: string[]
      monthIds?: string[]
      companyIds?: string[]
      classIds?: string[]
      ccIds?: string[]
      categoryIds?: string[]
      budgetIds?: string[]
      versionId?: string
    },
    signal?: AbortSignal,
  ): Promise<{ items: ExecutiveAlert[] }> {
    if (env.useMockApi) {
      await mockDelay(120)
      return { items: structuredClone(mockExecutiveDashboard.alerts) }
    }

    return apiGetData('/dashboard/alerts', serializeAlertsQuery(query), signal)
  },
}
