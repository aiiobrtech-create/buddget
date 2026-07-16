import { env } from '@/lib/env'
import { amountMatchesSearch } from '@/lib/formatters/currency'
import { apiDeleteData, apiGetData, apiPatchData, apiPostData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { userSession } from '@/lib/session'
import { getMockCompaniesSnapshot } from '@/services/modules/masters.service'
import { mockActuals } from '@/mocks/fixtures'
import type { ActualEntry, Id, UserAccessScope } from '@/types/entities'
import type { ApiPagination, ListParams } from '@/types/api'

function normalizeFilterList(values?: string[]): string | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered.join(',') : undefined
}

function resolveAllowedCompanyIds(
  access?: UserAccessScope,
  companies?: Array<{ id: string; companyGroupId?: string }>,
): Set<string> | undefined {
  if (!access) return undefined
  if (access.companyIds?.length) return new Set(access.companyIds)
  if (access.companyGroupIds?.length && companies) {
    const groupSet = new Set(access.companyGroupIds)
    const ids = companies.filter((company) => company.companyGroupId && groupSet.has(company.companyGroupId)).map((company) => company.id)
    return ids.length ? new Set(ids) : undefined
  }
  return undefined
}

function filterActualsByAccess(
  items: ActualEntry[],
  access?: UserAccessScope,
  companies?: Array<{ id: string; companyGroupId?: string }>,
): ActualEntry[] {
  if (!access) return items

  let filtered = items
  const allowedCompanies = resolveAllowedCompanyIds(access, companies)
  if (allowedCompanies) {
    filtered = filtered.filter((row) => allowedCompanies.has(row.companyId))
  }
  if (access.costCenterIds?.length) {
    const allowed = new Set(access.costCenterIds)
    filtered = filtered.filter((row) => allowed.has(row.costCenterId))
  }
  if (access.classIds?.length) {
    const allowed = new Set(access.classIds)
    filtered = filtered.filter((row) => Boolean(row.classId && allowed.has(row.classId)))
  }
  if (access.categoryIds?.length) {
    const allowed = new Set(access.categoryIds)
    filtered = filtered.filter((row) => Boolean(row.categoryId && allowed.has(row.categoryId)))
  }
  if (access.budgetItemIds?.length) {
    const allowed = new Set(access.budgetItemIds)
    filtered = filtered.filter((row) => row.budgetItemId && allowed.has(row.budgetItemId))
  }
  return filtered
}

export type ActualsListQuery = ListParams & {
  signal?: AbortSignal
  yearIds?: string[]
  monthIds?: string[]
  companyIds?: string[]
  classIds?: string[]
  ccIds?: string[]
  categoryIds?: string[]
  from?: string
  to?: string
  search?: string
}

function serializeActualsQuery(params: ActualsListQuery): Record<string, string | number | boolean | undefined> {
  const { signal: _signal, yearIds, monthIds, companyIds, classIds, ccIds, categoryIds, ...rest } = params
  const out: Record<string, string | number | boolean | undefined> = { ...rest }
  const serializedYearIds = normalizeFilterList(yearIds)
  const serializedMonthIds = normalizeFilterList(monthIds)
  const serializedCompanyIds = normalizeFilterList(companyIds)
  const serializedClassIds = normalizeFilterList(classIds)
  const serializedCcIds = normalizeFilterList(ccIds)
  const serializedCategoryIds = normalizeFilterList(categoryIds)
  if (serializedYearIds) out.yearIds = serializedYearIds
  if (serializedMonthIds) out.monthIds = serializedMonthIds
  if (serializedCompanyIds) out.companyIds = serializedCompanyIds
  if (serializedClassIds) out.classIds = serializedClassIds
  if (serializedCcIds) out.ccIds = serializedCcIds
  if (serializedCategoryIds) out.categoryIds = serializedCategoryIds
  return out
}

export const actualsService = {
  async list(params: ActualsListQuery): Promise<{
    items: ActualEntry[]
    pagination: ApiPagination
  }> {
    const { signal, ...query } = params
    if (env.useMockApi) {
      await mockDelay()
      const q = serializeActualsQuery(query)
      const search = typeof q.search === 'string' ? q.search.trim().toLowerCase() : ''
      const origin = typeof q.origin === 'string' ? q.origin : ''
      const status = typeof q.status === 'string' ? q.status : ''
      const from = typeof q.from === 'string' ? q.from : ''
      const to = typeof q.to === 'string' ? q.to : ''
      const yearIds = typeof q.yearIds === 'string' ? q.yearIds.split(',').map((s) => s.trim()) : []
      const monthIds = typeof q.monthIds === 'string' ? q.monthIds.split(',').map((s) => s.trim()) : []
      const companyIds = typeof q.companyIds === 'string' ? q.companyIds.split(',').map((s) => s.trim()) : []
      const classIds = typeof q.classIds === 'string' ? q.classIds.split(',').map((s) => s.trim()) : []
      const ccIds = typeof q.ccIds === 'string' ? q.ccIds.split(',').map((s) => s.trim()) : []
      const categoryIds = typeof q.categoryIds === 'string' ? q.categoryIds.split(',').map((s) => s.trim()) : []

      const user = userSession.get()
      let rawItems = structuredClone(mockActuals)
      rawItems = filterActualsByAccess(rawItems, user?.access, getMockCompaniesSnapshot())

      const items = rawItems.filter((r) => {
        if (search) {
          const hay = `${r.description ?? ''} ${r.sourceRef ?? ''}`.toLowerCase()
          if (!hay.includes(search) && !amountMatchesSearch(r.amount, search)) return false
        }
        if (origin && origin !== 'all' && r.origin !== origin) return false
        if (status && status !== 'all' && r.status !== status) return false
        if (from && r.date < from) return false
        if (to && r.date > to) return false
        if (!from && !to && yearIds.length && !yearIds.includes('all')) {
          const year = Number(yearIds[0])
          if (Number.isFinite(year) && !r.date.startsWith(String(year))) return false
          if (monthIds.length && !monthIds.includes('all')) {
            const month = Number(r.date.slice(5, 7))
            if (!monthIds.map(Number).includes(month)) return false
          }
        }
        if (companyIds.length && !companyIds.includes('all') && !companyIds.includes(r.companyId)) return false
        if (classIds.length && !classIds.includes('all') && !(r.classId && classIds.includes(r.classId))) return false
        if (ccIds.length && !ccIds.includes('all') && !ccIds.includes(r.costCenterId)) return false
        if (categoryIds.length && !categoryIds.includes('all')) {
          if (!r.categoryId) return false
          if (!categoryIds.includes(r.categoryId)) return false
        }
        return true
      })
      return {
        items,
        pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
      }
    }
    // Escopos já são aplicados no backend; refiltrar no client quebrava paginação/totais.
    return apiGetData<{ items: ActualEntry[]; pagination: ApiPagination }>('/actuals', serializeActualsQuery(query), signal)
  },

  async getById(id: Id, signal?: AbortSignal): Promise<ActualEntry> {
    if (env.useMockApi) {
      await mockDelay()
      const a = mockActuals.find((x) => x.id === id)
      if (!a) throw new Error('LanÃ§amento nÃ£o encontrado')
      return structuredClone(a)
    }
    return apiGetData(`/actuals/${id}`, undefined, signal)
  },

  async create(entry: Omit<ActualEntry, 'id'>): Promise<{ id: Id }> {
    if (env.useMockApi) {
      await mockDelay(300)
      return { id: `act-${Date.now()}` }
    }
    return apiPostData('/actuals', entry)
  },

  async importFile(file: File): Promise<{
    batchId: string
    totalRows: number
    validRows: number
    invalidRows: number
    errors: string[]
    errorReportTxt?: string | null
    errorReportFileName?: string | null
    message?: string
  }> {
    if (env.useMockApi) {
      await mockDelay(400)
      return { batchId: `batch-${Date.now()}`, totalRows: 1, validRows: 1, invalidRows: 0, errors: [] }
    }
    const form = new FormData()
    form.append('file', file)
    const data = await apiPostData<{
      batchId: string
      totalRows: number
      validRows: number
      invalidRows: number
      errors?: string[] | null
      errorReportTxt?: string | null
      errorReportFileName?: string | null
      message?: string
    }>('/actuals/import', form)

    return {
      batchId: data.batchId,
      totalRows: data.totalRows ?? 0,
      validRows: data.validRows ?? 0,
      invalidRows: data.invalidRows ?? 0,
      errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
      errorReportTxt: data.errorReportTxt ?? null,
      errorReportFileName: data.errorReportFileName ?? null,
      message: data.message,
    }
  },

  async update(id: Id, entry: Partial<ActualEntry>): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(300)
      return
    }
    await apiPatchData(`/actuals/${id}`, entry)
  },

  async delete(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(300)
      return
    }
    await apiDeleteData(`/actuals/${id}`)
  },
}
