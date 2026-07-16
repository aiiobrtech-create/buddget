import { env } from '@/lib/env'
import { apiGetData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { userSession } from '@/lib/session'
import { mockExecutiveDashboard } from '@/mocks/fixtures'
import type { ExecutiveDashboard } from '@/types/dashboard'

function normalizeFilterList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered : undefined
}

function accessFactorFromUser(): number {
  const user = userSession.get()
  if (!user || user.role === 'admin' || !user.access) return 1

  let factor = 1
  const access = user.access
  if (access.companyIds?.length || access.companyGroupIds?.length) factor *= 0.4
  if (access.costCenterIds?.length) factor *= 0.6
  if (access.classIds?.length) factor *= 0.75
  if (access.categoryIds?.length) factor *= 0.3
  if (access.budgetItemIds?.length) factor *= 0.5
  return factor
}

function serializeDashboardQuery(query?: {
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

export const dashboardService = {
  async getExecutive(
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
    signal?: AbortSignal
  ): Promise<ExecutiveDashboard> {
    if (env.useMockApi) {
      await mockDelay()
      const data = structuredClone(mockExecutiveDashboard)

      let factor = 1
      if (query?.companyIds?.length && !query.companyIds.includes('c1') && !query.companyIds.includes('all')) factor *= 0.4
      if (query?.ccIds?.length && !query.ccIds.includes('all')) factor *= 0.6
      if (query?.classIds?.length && !query.classIds.includes('all')) factor *= 0.75
      if (query?.categoryIds?.length && !query.categoryIds.includes('all')) factor *= 0.3
      factor *= accessFactorFromUser()
      if (query?.monthIds?.length && !query.monthIds.includes('all')) {
        const month = Number(query.monthIds.find((id) => id !== 'all') ?? 1)
        factor *= month / 12
      }
      if (query?.yearIds?.length && !query.yearIds.includes('all') && !query.yearIds.includes('2026')) factor *= 1.15

      if (factor !== 1) {
        data.kpis.budgetTotal *= factor
        data.kpis.actualTotal *= factor
        data.kpis.varianceValue = data.kpis.actualTotal - data.kpis.budgetTotal
        data.kpis.variancePct = data.kpis.budgetTotal > 0 ? (data.kpis.varianceValue / data.kpis.budgetTotal) * 100 : 0
        data.kpis.availableBalance *= factor
        data.kpis.committed *= factor
        data.kpis.forecastTotal *= factor

        data.charts.budgetVsActualByMonth = data.charts.budgetVsActualByMonth.map((c) => ({
          ...c,
          orcado: c.orcado * factor,
          realizado: c.realizado * factor,
        }))
        data.charts.categorySplit = data.charts.categorySplit.map((c) => ({ ...c, value: c.value * factor }))
        data.charts.topVariances = data.charts.topVariances.map((c) => ({ ...c, variance: c.variance * factor }))
        data.charts.executionByCostCenter = data.charts.executionByCostCenter.map((c) => ({
          ...c,
          executionPct: c.executionPct * (factor > 1 ? 1.1 : 0.9),
        }))
        data.charts.forecastTrend = data.charts.forecastTrend.map((c) => ({
          ...c,
          original: c.original * factor,
          revisao: c.revisao * factor,
          forecast: c.forecast * factor,
        }))
        data.charts.annualConsolidated = data.charts.annualConsolidated.map((c) => ({
          ...c,
          orcadoAcum: c.orcadoAcum * factor,
          realizadoAcum: c.realizadoAcum * factor,
        }))
      }

      return data
    }
    return apiGetData<ExecutiveDashboard>('/dashboard/executive', serializeDashboardQuery(query), signal)
  },
}
