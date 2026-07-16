import { env } from '@/lib/env'
import { apiDeleteData, apiGetData, apiPostData } from '@/services/api/client'
import { unwrapItems } from '@/services/api/unwrap'
import { mockDelay } from '@/mocks/delay'
import { mockBudgets } from '@/mocks/fixtures'
import { getMockCompaniesSnapshot, mastersService } from '@/services/modules/masters.service'
import { userSession } from '@/lib/session'
import type { Budget, BudgetLine, BudgetStatus, BudgetVersion, BudgetVersionDetail, BudgetVersionType, Id } from '@/types/entities'
import type { ApiPagination } from '@/types/api'

export interface BudgetPlanningRow {
  id: string
  month: number
  companyId?: string
  classId?: string
  categoryId?: string
  costCenterId?: string
  itemId?: string
  costCenterCode: string
  categoryCode: string
  itemCode?: string
  plannedAmount: number
}

function mapStatus(status: string): BudgetStatus {
  const s = status.toLowerCase() as BudgetStatus
  if (s === 'draft' || s === 'published' || s === 'archived') return s
  return 'draft'
}

async function resolveCompanyIdForGroup(companyGroupId: Id, signal?: AbortSignal): Promise<Id | undefined> {
  const companies = env.useMockApi
    ? getMockCompaniesSnapshot()
    : await mastersService.listCompanies(signal)
  return companies.find((c) => c.companyGroupId === companyGroupId && c.active)?.id
}

function toPlanningVersion(budget: Budget, version: BudgetVersionDetail): BudgetVersion {
  const statusSuffix =
    version.status === 'published' ? ' — Publicado' : version.status === 'draft' ? ' — Rascunho' : ''
  const companyId =
    budget.companyId ??
    getMockCompaniesSnapshot().find((c) => c.companyGroupId === budget.companyGroupId && c.active)?.id ??
    ''
  return {
    id: version.id,
    year: budget.year,
    label: `v${budget.year}.${version.versionNumber} — ${version.name}${statusSuffix}`,
    status: version.status,
    companyId,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt,
    budgetId: version.budgetId,
    name: version.name,
    type: version.type,
    versionNumber: version.versionNumber,
  }
}

function mapApiVersion(raw: Record<string, unknown>, budgetId: string): BudgetVersionDetail {
  return {
    id: String(raw.id),
    budgetId,
    name: String(raw.name),
    type: String(raw.type) as BudgetVersionType,
    versionNumber: Number(raw.versionNumber),
    status: mapStatus(String(raw.status)),
    baseVersionId: raw.baseVersionId ? String(raw.baseVersionId) : undefined,
    createdAt: String(raw.createdAt),
    publishedAt: raw.publishedAt ? String(raw.publishedAt) : undefined,
  }
}

function mapApiBudget(raw: Record<string, unknown>, companyGroupId?: string): Budget {
  const id = String(raw.id)
  const versions = Array.isArray(raw.versions)
    ? raw.versions.map((v) => mapApiVersion(v as Record<string, unknown>, id))
    : []
  const companyId = raw.companyId ? String(raw.companyId) : undefined
  return {
    id,
    companyGroupId: String(raw.companyGroupId ?? companyGroupId ?? companyId ?? ''),
    companyId,
    year: Number(raw.year),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    currency: String(raw.currency ?? 'BRL'),
    status: mapStatus(String(raw.status)),
    createdAt: String(raw.createdAt),
    versions,
  }
}

let mockBudgetsStore: Budget[] = structuredClone(mockBudgets)

function flattenVersions(budgets: Budget[]): BudgetVersion[] {
  return budgets.flatMap((budget) => budget.versions.map((version) => toPlanningVersion(budget, version)))
}

export const budgetsService = {
  async listBudgets(params?: { companyGroupId?: Id; companyId?: Id; signal?: AbortSignal }): Promise<{ items: Budget[] }> {
    if (env.useMockApi) {
      await mockDelay()
      let items = structuredClone(mockBudgetsStore)
      if (params?.companyGroupId) {
        items = items.filter((b) => b.companyGroupId === params.companyGroupId)
      } else if (params?.companyId) {
        const groupId = getMockCompaniesSnapshot().find((c) => c.id === params.companyId)?.companyGroupId
        items = items.filter(
          (b) => b.companyId === params.companyId || (groupId ? b.companyGroupId === groupId : false),
        )
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/resumo') {
        const user = userSession.get()
        if (user && user.role !== 'admin' && user.access) {
          if (user.access.companyIds && user.access.companyIds.length > 0) {
            const allowed = new Set(user.access.companyIds)
            items = items.filter(b => b.companyId && allowed.has(b.companyId))
          } else if (user.access.companyGroupIds && user.access.companyGroupIds.length > 0) {
            const allowed = new Set(user.access.companyGroupIds)
            items = items.filter(b => allowed.has(b.companyGroupId))
          }
        }
      }

      return { items }
    }
    const companyId =
      params?.companyId ??
      (params?.companyGroupId
        ? await resolveCompanyIdForGroup(params.companyGroupId, params?.signal)
        : undefined)
    const raw = await apiGetData<Record<string, unknown>[] | { items: Record<string, unknown>[] }>(
      '/budgets',
      companyId ? { companyId } : undefined,
      params?.signal,
    )
    const companies = await mastersService.listCompanies(params?.signal)
    const groupByCompany = new Map(companies.map((c) => [c.id, c.companyGroupId]))
    let filteredItems = unwrapItems(raw).map((row) =>
      mapApiBudget(row, groupByCompany.get(String(row.companyId ?? ''))),
    )

    if (typeof window !== 'undefined' && window.location.pathname !== '/resumo') {
      const user = userSession.get()
      if (user && user.role !== 'admin' && user.access) {
        if (user.access.companyIds && user.access.companyIds.length > 0) {
          const allowed = new Set(user.access.companyIds)
          filteredItems = filteredItems.filter(b => b.companyId && allowed.has(b.companyId))
        } else if (user.access.companyGroupIds && user.access.companyGroupIds.length > 0) {
          const allowed = new Set(user.access.companyGroupIds)
          filteredItems = filteredItems.filter(b => allowed.has(b.companyGroupId))
        }
      }
    }

    return { items: filteredItems }
  },

  async createBudget(payload: {
    companyGroupId: Id
    companyId?: Id
    year: number
    name: string
    description?: string
    currency?: string
  }): Promise<Budget> {
    const companyId = payload.companyId ?? (await resolveCompanyIdForGroup(payload.companyGroupId))
    if (env.useMockApi) {
      await mockDelay(280)
      const id = `b-${Date.now()}`
      const versionId = `v-${Date.now()}`
      const created: Budget = {
        id,
        companyGroupId: payload.companyGroupId,
        companyId,
        year: payload.year,
        name: payload.name.trim(),
        description: payload.description?.trim() || undefined,
        currency: payload.currency ?? 'BRL',
        status: 'draft',
        createdAt: new Date().toISOString(),
        versions: [
          {
            id: versionId,
            budgetId: id,
            name: 'Versão original',
            type: 'ORIGINAL',
            versionNumber: 1,
            status: 'draft',
            createdAt: new Date().toISOString(),
          },
        ],
      }
      mockBudgetsStore = [created, ...mockBudgetsStore]
      return structuredClone(created)
    }
    if (!companyId) throw new Error('Nenhuma empresa vinculada ao grupo selecionado')
    const raw = await apiPostData<Record<string, unknown>>('/budgets', {
      companyId,
      year: payload.year,
      name: payload.name,
      description: payload.description,
      currency: payload.currency ?? 'BRL',
    })
    const mapped = mapApiBudget(raw)
    mapped.companyGroupId = payload.companyGroupId
    if (mapped.versions.length === 0) {
      const full = await this.listBudgets({ companyGroupId: payload.companyGroupId })
      const found = full.items.find((b) => b.id === mapped.id)
      if (found) return found
    }
    return mapped
  },

  async createVersion(
    budgetId: Id,
    payload: { name: string; type: BudgetVersionType; baseVersionId?: Id },
  ): Promise<BudgetVersionDetail> {
    if (env.useMockApi) {
      await mockDelay(280)
      const budget = mockBudgetsStore.find((b) => b.id === budgetId)
      if (!budget) throw new Error('Orçamento não encontrado')
      const latest = budget.versions.reduce((max, v) => Math.max(max, v.versionNumber), 0)
      const created: BudgetVersionDetail = {
        id: `v-${Date.now()}`,
        budgetId,
        name: payload.name.trim(),
        type: payload.type,
        versionNumber: latest + 1,
        status: 'draft',
        baseVersionId: payload.baseVersionId,
        createdAt: new Date().toISOString(),
      }
      budget.versions = [...budget.versions, created]
      return structuredClone(created)
    }
    const raw = await apiPostData<Record<string, unknown>>(`/budgets/${budgetId}/versions`, payload)
    return mapApiVersion(raw, budgetId)
  },

  async listVersions(signal?: AbortSignal): Promise<{ items: BudgetVersion[]; pagination: ApiPagination }> {
    if (env.useMockApi) {
      await mockDelay()
      const items = flattenVersions(mockBudgetsStore)
      return {
        items: structuredClone(items),
        pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
      }
    }
    const { items } = await this.listBudgets({ signal })
    const versions = flattenVersions(items)
    return {
      items: versions,
      pagination: { page: 1, pageSize: 20, totalItems: versions.length, totalPages: 1 },
    }
  },

  async getPlanningTable(params: {
    versionId: Id
    year: number
    signal?: AbortSignal
  }): Promise<{ rows: BudgetPlanningRow[] }> {
    if (env.useMockApi) {
      await mockDelay()
      const rows: BudgetPlanningRow[] = Array.from({ length: 12 }).map((_, i) => ({
        id: `pl-${i}`,
        month: i + 1,
        costCenterCode: i % 2 === 0 ? '2' : '4',
        categoryCode: i % 3 === 0 ? '1' : '2',
        plannedAmount: 180_000 + i * 12_500,
      }))
      return { rows }
    }
    return apiGetData('/budgets/planning', { versionId: params.versionId, year: params.year }, params.signal)
  },

  async saveDraft(versionId: Id, lines: Partial<BudgetLine>[]): Promise<{ ok: true }> {
    if (env.useMockApi) {
      await mockDelay(280)
      return { ok: true }
    }
    return apiPostData('/budgets/versions/draft', { versionId, lines })
  },

  async publish(versionId: Id): Promise<{ ok: true }> {
    if (env.useMockApi) {
      await mockDelay(400)
      const budget = mockBudgetsStore.find((b) => b.versions.some((v) => v.id === versionId))
      const version = budget?.versions.find((v) => v.id === versionId)
      if (!budget || !version) throw new Error('Versão não encontrada')
      if (version.status !== 'draft') throw new Error('Somente versões em rascunho podem ser publicadas')
      const now = new Date().toISOString()
      for (const v of budget.versions) {
        if (v.status === 'published') v.status = 'archived'
      }
      version.status = 'published'
      version.publishedAt = now
      budget.status = 'published'
      return { ok: true }
    }
    return apiPostData(`/budget-versions/${versionId}/publish`, {})
  },

  async duplicate(versionId: Id, _label: string): Promise<{ newVersionId: Id }> {
    if (env.useMockApi) {
      await mockDelay(350)
      return { newVersionId: `v-${Date.now()}` }
    }
    const res = await apiPostData<{ id: string }>(`/budget-versions/${versionId}/duplicate`, {})
    return { newVersionId: res.id }
  },

  async deleteBudget(budgetId: Id): Promise<{ deleted: true; linesDeleted: number; versionsDeleted: number; actualsDeleted: number }> {
    if (env.useMockApi) {
      await mockDelay(280)
      const budget = mockBudgetsStore.find((b) => b.id === budgetId)
      if (!budget) throw new Error('Orçamento não encontrado')
      const versionsDeleted = budget.versions.length
      mockBudgetsStore = mockBudgetsStore.filter((b) => b.id !== budgetId)
      return { deleted: true, linesDeleted: 0, versionsDeleted, actualsDeleted: 0 }
    }
    return apiDeleteData(`/budgets/${budgetId}`)
  },

  async deleteVersion(versionId: Id): Promise<{ deleted: true; linesDeleted: number }> {
    if (env.useMockApi) {
      await mockDelay(280)
      const budget = mockBudgetsStore.find((b) => b.versions.some((v) => v.id === versionId))
      if (!budget) throw new Error('Versão não encontrada')
      if (budget.versions.length <= 1) {
        throw new Error('Não é possível excluir a única versão do orçamento. Exclua o orçamento inteiro.')
      }
      budget.versions = budget.versions.filter((v) => v.id !== versionId)
      if (budget.status === 'published' && !budget.versions.some((v) => v.status === 'published')) {
        budget.status = 'draft'
      }
      return { deleted: true, linesDeleted: 0 }
    }
    return apiDeleteData(`/budget-versions/${versionId}`)
  },
}
