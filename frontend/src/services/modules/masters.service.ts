import { env } from '@/lib/env'
import { notifyMastersChanged } from '@/lib/masters-events'
import { apiDeleteData, apiGetData, apiPatchData, apiPostData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { userSession } from '@/lib/session'
import { normalizeUserAccess } from '@/lib/user-access'
import {
  mockCategories,
  mockClasses,
  mockCompanies,
  mockCompanyGroups,
  mockCostCenters,
  mockBudgetItems,
  mockNatures,
  mockProfiles,
  mockProjects,
  mockUsers,
} from '@/mocks/fixtures'
import type {
  BudgetItem,
  Category,
  Company,
  CompanyGroup,
  CostCenter,
  Id,
  LedgerClass,
  Nature,
  Project,
  RoleProfile,
  UserAccount,
} from '@/types/entities'

let mockCompanyGroupsStore: CompanyGroup[] = structuredClone(mockCompanyGroups)
let mockCompaniesStore: Company[] = structuredClone(mockCompanies)

async function afterMastersWrite<T>(result: T): Promise<T> {
  notifyMastersChanged()
  return result
}

async function afterMastersDelete(run: () => Promise<void>): Promise<void> {
  await run()
  notifyMastersChanged()
}

export function getMockCompaniesSnapshot(): Company[] {
  return mockCompaniesStore
}

function filterListByAccess<T extends { id: string; companyGroupId?: string; companyId?: string | null }>(
  list: T[],
  scopeKey: 'companyGroupIds' | 'companyIds' | 'classIds' | 'categoryIds' | 'costCenterIds' | 'budgetItemIds'
): T[] {
  if (typeof window !== 'undefined' && window.location.pathname === '/resumo') {
    return list
  }
  const user = userSession.get()
  if (!user || user.role === 'admin') {
    return list
  }
  const access = normalizeUserAccess(user.access)
  if (!access) {
    return list
  }

  let filtered = list
  const allowedIds = access[scopeKey]
  if (allowedIds && allowedIds.length > 0) {
    const set = new Set(allowedIds)
    filtered = filtered.filter((item) => set.has(item.id))
  }

  if (scopeKey === 'companyIds' && access.companyGroupIds && access.companyGroupIds.length > 0) {
    const groupSet = new Set(access.companyGroupIds)
    filtered = filtered.filter((item) => {
      const company = item as unknown as Company
      return company.companyGroupId && groupSet.has(company.companyGroupId)
    })
  }

  if (scopeKey === 'costCenterIds' && access.companyIds && access.companyIds.length > 0) {
    const companySet = new Set(access.companyIds)
    filtered = filtered.filter((item) => {
      const cc = item as unknown as CostCenter
      return cc.companyId && companySet.has(cc.companyId)
    })
  }

  return filtered
}

export const mastersService = {
  async listCompanyGroups(s?: AbortSignal): Promise<CompanyGroup[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockCompanyGroupsStore), 'companyGroupIds')
    }
    const r = await apiGetData<{ items: CompanyGroup[] }>('/masters/company-groups', undefined, s)
    return filterListByAccess(r.items, 'companyGroupIds')
  },

  async listCompanies(s?: AbortSignal): Promise<Company[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockCompaniesStore), 'companyIds')
    }
    const r = await apiGetData<{ items: Company[] }>('/masters/companies', undefined, s)
    return filterListByAccess(r.items, 'companyIds')
  },

  async listCostCenters(s?: AbortSignal): Promise<CostCenter[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockCostCenters), 'costCenterIds')
    }
    const r = await apiGetData<{ items: CostCenter[] }>('/masters/cost-centers', undefined, s)
    return filterListByAccess(r.items, 'costCenterIds')
  },

  async listBudgetItems(s?: AbortSignal): Promise<BudgetItem[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockBudgetItems), 'budgetItemIds')
    }
    const r = await apiGetData<{ items: BudgetItem[] }>('/masters/budget-items', undefined, s)
    return filterListByAccess(r.items, 'budgetItemIds')
  },

  async listCategories(s?: AbortSignal): Promise<Category[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockCategories), 'categoryIds')
    }
    const r = await apiGetData<{ items: Category[] }>('/masters/categories', undefined, s)
    return filterListByAccess(r.items, 'categoryIds')
  },

  async listClasses(s?: AbortSignal): Promise<LedgerClass[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return filterListByAccess(structuredClone(mockClasses), 'classIds')
    }
    const r = await apiGetData<{ items: LedgerClass[] }>('/masters/classes', undefined, s)
    return filterListByAccess(r.items, 'classIds')
  },

  async listNatures(s?: AbortSignal): Promise<Nature[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return structuredClone(mockNatures)
    }
    const r = await apiGetData<{ items: Nature[] }>('/masters/natures', undefined, s)
    return r.items
  },

  async listProjects(s?: AbortSignal): Promise<Project[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return structuredClone(mockProjects)
    }
    const r = await apiGetData<{ items: Project[] }>('/masters/projects', undefined, s)
    return r.items
  },

  async listUsers(s?: AbortSignal): Promise<UserAccount[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return structuredClone(mockUsers)
    }
    const r = await apiGetData<{ items: UserAccount[] }>('/masters/users', undefined, s)
    return r.items
  },

  async listProfiles(s?: AbortSignal): Promise<RoleProfile[]> {
    if (env.useMockApi) {
      await mockDelay(150)
      return structuredClone(mockProfiles)
    }
    const r = await apiGetData<{ items: RoleProfile[] }>('/masters/roles', undefined, s)
    return r.items
  },

  async createCompanyGroup(row: Omit<CompanyGroup, 'id' | 'createdAt'>): Promise<CompanyGroup> {
    if (env.useMockApi) {
      await mockDelay(200)
      const created = { ...row, id: `cg-${Date.now()}`, createdAt: new Date().toISOString() }
      mockCompanyGroupsStore = [created, ...mockCompanyGroupsStore]
      return afterMastersWrite(structuredClone(created))
    }
    return afterMastersWrite(await apiPostData('/masters/company-groups', row))
  },

  async updateCompanyGroup(id: Id, row: Partial<CompanyGroup>): Promise<CompanyGroup> {
    if (env.useMockApi) {
      await mockDelay(200)
      mockCompanyGroupsStore = mockCompanyGroupsStore.map((g) => (g.id === id ? { ...g, ...row } : g))
      return afterMastersWrite(structuredClone(mockCompanyGroupsStore.find((g) => g.id === id)!))
    }
    return afterMastersWrite(await apiPatchData(`/masters/company-groups/${id}`, row))
  },

  async deleteCompanyGroup(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      mockCompanyGroupsStore = mockCompanyGroupsStore.filter((g) => g.id !== id)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/company-groups/${id}`))
  },

  async createCompany(row: Omit<Company, 'id' | 'createdAt'>): Promise<Company> {
    if (env.useMockApi) {
      await mockDelay(200)
      const created = { ...row, id: `c-${Date.now()}`, createdAt: new Date().toISOString() }
      mockCompaniesStore = [created, ...mockCompaniesStore]
      return afterMastersWrite(structuredClone(created))
    }
    return afterMastersWrite(
      await apiPostData('/masters/companies', {
        companyGroupId: row.companyGroupId,
        code: row.code,
        name: row.name,
        taxId: row.taxId,
        active: row.active,
      }),
    )
  },

  async updateCompany(id: Id, row: Partial<Company>): Promise<Company> {
    if (env.useMockApi) {
      await mockDelay(200)
      mockCompaniesStore = mockCompaniesStore.map((c) => (c.id === id ? { ...c, ...row } : c))
      return afterMastersWrite(structuredClone(mockCompaniesStore.find((c) => c.id === id)!))
    }
    return afterMastersWrite(
      await apiPatchData(`/masters/companies/${id}`, {
        companyGroupId: row.companyGroupId,
        name: row.name,
        taxId: row.taxId,
        active: row.active,
      }),
    )
  },

  async deleteCompany(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      mockCompaniesStore = mockCompaniesStore.filter((c) => c.id !== id)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/companies/${id}`))
  },

  async createCostCenter(row: Omit<CostCenter, 'id'>): Promise<CostCenter> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...row, id: `cc-${Date.now()}` })
    }
    return afterMastersWrite(await apiPostData('/masters/cost-centers', row))
  },

  async updateCostCenter(id: Id, row: Partial<CostCenter>): Promise<CostCenter> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...(row as CostCenter), id })
    }
    return afterMastersWrite(await apiPatchData(`/masters/cost-centers/${id}`, row))
  },

  async deleteCostCenter(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/cost-centers/${id}`))
  },

  async createBudgetItem(row: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...row, id: `bi-${Date.now()}` })
    }
    return afterMastersWrite(await apiPostData('/masters/budget-items', row))
  },

  async updateBudgetItem(id: Id, row: Partial<BudgetItem>): Promise<BudgetItem> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...(row as BudgetItem), id })
    }
    return afterMastersWrite(await apiPatchData(`/masters/budget-items/${id}`, row))
  },

  async deleteBudgetItem(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/budget-items/${id}`))
  },

  async createLedgerClass(row: Omit<LedgerClass, 'id'>): Promise<LedgerClass> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...row, id: `cl-${Date.now()}` })
    }
    return afterMastersWrite(await apiPostData('/masters/classes', row))
  },

  async updateLedgerClass(id: Id, row: Partial<LedgerClass>): Promise<LedgerClass> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...(row as LedgerClass), id })
    }
    return afterMastersWrite(await apiPatchData(`/masters/classes/${id}`, row))
  },

  async deleteLedgerClass(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/classes/${id}`))
  },

  async createCategory(row: Omit<Category, 'id'>): Promise<Category> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...row, id: `cat-${Date.now()}` })
    }
    return afterMastersWrite(await apiPostData('/masters/categories', row))
  },

  async updateCategory(id: Id, row: Partial<Category>): Promise<Category> {
    if (env.useMockApi) {
      await mockDelay(200)
      return afterMastersWrite({ ...(row as Category), id })
    }
    return afterMastersWrite(await apiPatchData(`/masters/categories/${id}`, row))
  },

  async deleteCategory(id: Id): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(200)
      notifyMastersChanged()
      return
    }
    return afterMastersDelete(() => apiDeleteData(`/masters/categories/${id}`))
  },

  /** Usado pelos cadastros mock para manter lista compartilhada entre telas. */
  setMockCompanyGroups(groups: CompanyGroup[]) {
    if (env.useMockApi) mockCompanyGroupsStore = structuredClone(groups)
  },

  setMockCompanies(companies: Company[]) {
    if (env.useMockApi) mockCompaniesStore = structuredClone(companies)
  },
}
