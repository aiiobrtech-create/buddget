import { env } from '@/lib/env'
import {
  computeYearEndForecast,
  scaleProjection,
  type MonthlyBudgetActual,
} from '@/lib/forecast/year-end-projection'
import { apiDeleteData, apiGetData, apiPatchData, apiPostData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { mockExecutiveDashboard, mockForecastRevisions } from '@/mocks/fixtures'
import type { ExecutiveDashboard } from '@/types/dashboard'
import type { ForecastRevision, Id } from '@/types/entities'

const MONTH_INDEX: Record<string, number> = {
  Jan: 1,
  Fev: 2,
  Mar: 3,
  Abr: 4,
  Mai: 5,
  Jun: 6,
  Jul: 7,
  Ago: 8,
  Set: 9,
  Out: 10,
  Nov: 11,
  Dez: 12,
}

function normalizeFilterList(values?: string[]): string | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered.join(',') : undefined
}

function serializeForecastQuery(query?: {
  yearIds?: string[]
  monthIds?: string[]
  companyIds?: string[]
}): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  const yearIds = normalizeFilterList(query?.yearIds)
  const monthIds = normalizeFilterList(query?.monthIds)
  const companyIds = normalizeFilterList(query?.companyIds)
  if (yearIds) out.yearIds = yearIds
  if (monthIds) out.monthIds = monthIds
  if (companyIds) out.companyIds = companyIds
  return out
}

function monthlySeriesFromDashboard(dashboard: ExecutiveDashboard): MonthlyBudgetActual[] {
  return dashboard.charts.budgetVsActualByMonth.map((row) => ({
    month: MONTH_INDEX[row.label] ?? Number(row.key),
    budget: row.orcado,
    actual: row.realizado,
  }))
}

function enrichRevision(
  item: Omit<ForecastRevision, 'projection' | 'totals'> & { scale?: number },
  baseProjection: ReturnType<typeof computeYearEndForecast>,
): ForecastRevision {
  const scale = item.scale ?? 1
  const projection = scaleProjection(baseProjection, scale)
  return {
    id: item.id,
    label: item.label,
    baseVersionId: item.baseVersionId,
    createdAt: item.createdAt,
    createdBy: item.createdBy,
    projection: {
      actualYtd: projection.actualYtd,
      budgetYtd: projection.budgetYtd,
      budgetAnnual: projection.budgetAnnual,
      monthsClosed: projection.monthsClosed,
      runRateRatio: projection.runRateRatio,
      projectedRemaining: projection.projectedRemaining,
      methodology: projection.methodology,
    },
    totals: {
      original: projection.budgetAnnual,
      revised: projection.budgetAnnual,
      forecast: projection.forecastYearEnd,
    },
  }
}

function buildMockItems(): ForecastRevision[] {
  const months = monthlySeriesFromDashboard(mockExecutiveDashboard)
  const base = computeYearEndForecast(months, mockExecutiveDashboard.kpis.budgetTotal)

  return [
    enrichRevision({ ...mockForecastRevisions[0], scale: 1 }, base),
    enrichRevision({ ...mockForecastRevisions[1], scale: 0.12 }, base),
  ]
}

export const forecastsService = {
  async list(
    query?: {
      yearIds?: string[]
      monthIds?: string[]
      companyIds?: string[]
    },
    signal?: AbortSignal,
  ): Promise<{ items: ForecastRevision[] }> {
    if (env.useMockApi) {
      await mockDelay()
      return { items: buildMockItems() }
    }
    return apiGetData('/forecasts/revisions', serializeForecastQuery(query), signal)
  },

  async createForecast(payload: { label: string; baseVersionId: Id; notes?: string }): Promise<{ id: Id }> {
    if (env.useMockApi) {
      await mockDelay(420)
      return { id: `fr-${Date.now()}` }
    }
    return apiPostData('/forecasts/revisions', payload)
  },

  async updateForecast(
    id: Id,
    payload: { label?: string; baseVersionId?: Id; forecastAmount?: number },
    signal?: AbortSignal,
  ): Promise<{ ok: boolean }> {
    if (env.useMockApi) {
      await mockDelay(320)
      return { ok: true }
    }
    return apiPatchData(`/forecasts/revisions/${id}`, payload, signal)
  },

  async deleteForecast(id: Id, signal?: AbortSignal): Promise<{ ok: boolean }> {
    if (env.useMockApi) {
      await mockDelay(280)
      return { ok: true }
    }
    return apiDeleteData(`/forecasts/revisions/${id}`, signal)
  },
}

export { computeYearEndForecast, monthlySeriesFromDashboard }
