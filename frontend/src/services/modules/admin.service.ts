import { env } from '@/lib/env'
import { AUDIT_CRUD_ACTIONS } from '@/lib/formatters/audit-action'
import { EMPTY_USER_ACCESS, normalizeUserAccess } from '@/lib/user-access'
import { roleHasScopedAccess } from '@/lib/scoped-access-roles'
import { apiDeleteData, apiGetData, apiPatchData, apiPostData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { mockAuditLogs, mockIntegrations, mockParameters, mockUsers } from '@/mocks/fixtures'
import type { AuditLogEntry, IntegrationEndpoint, SystemParameter, UserAccount, UserAccessScope } from '@/types/entities'
import type { UserRole } from '@/types/entities'

export type AdminUserInput = {
  name: string
  email: string
  role: UserRole
  active: boolean
  password?: string
  access?: UserAccessScope
  allowResumo?: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeAccessScope(access?: UserAccessScope): UserAccessScope {
  const source = normalizeUserAccess(access)
  const onlyUuids = (ids: string[]) => ids.filter((id) => UUID_RE.test(id))
  return {
    companyGroupIds: onlyUuids(source.companyGroupIds),
    companyIds: onlyUuids(source.companyIds),
    classIds: onlyUuids(source.classIds),
    categoryIds: onlyUuids(source.categoryIds),
    costCenterIds: onlyUuids(source.costCenterIds),
    budgetItemIds: onlyUuids(source.budgetItemIds),
  }
}

function accessPayloadForRole(role: UserRole, access?: UserAccessScope) {
  if (!roleHasScopedAccess(role)) return { ...EMPTY_USER_ACCESS }
  return sanitizeAccessScope(access)
}

export const adminService = {
  async listUsers(): Promise<UserAccount[]> {
    if (env.useMockApi) {
      await mockDelay(180)
      return structuredClone(mockUsers)
    }
    const r = await apiGetData<{ items: UserAccount[] }>('/admin/users')
    return r.items.map((item) => ({
      ...item,
      access: normalizeUserAccess(item.access),
    }))
  },

  async createUser(input: AdminUserInput): Promise<UserAccount> {
    if (env.useMockApi) {
      await mockDelay(220)
      return {
        id: `u-${Date.now()}`,
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        access: input.access ?? { ...EMPTY_USER_ACCESS },
        allowResumo: input.allowResumo ?? true,
      }
    }
    return apiPostData<UserAccount>('/admin/users', {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      password: input.password ?? 'TempPass123!',
      allowResumo: input.allowResumo ?? true,
      ...(roleHasScopedAccess(input.role) ? { access: accessPayloadForRole(input.role, input.access) } : {}),
    })
  },

  async updateUser(id: string, input: Partial<AdminUserInput>): Promise<UserAccount> {
    if (env.useMockApi) {
      await mockDelay(200)
      return {
        id,
        name: input.name ?? '',
        email: input.email ?? '',
        role: input.role ?? 'consulta',
        active: input.active ?? true,
        access: input.access ?? { ...EMPTY_USER_ACCESS },
        allowResumo: input.allowResumo ?? true,
      }
    }
    const payload: Partial<AdminUserInput> = { ...input }
    if (input.role !== undefined) {
      payload.access = accessPayloadForRole(input.role, input.access)
    } else if (input.access !== undefined) {
      payload.access = sanitizeAccessScope(input.access)
    }
    return apiPatchData<UserAccount>(`/admin/users/${id}`, payload)
  },

  async deleteUser(id: string): Promise<void> {
    if (env.useMockApi) {
      await mockDelay(180)
      return
    }
    await apiDeleteData(`/admin/users/${id}`)
  },

  async listAudit(s?: AbortSignal): Promise<AuditLogEntry[]> {
    if (env.useMockApi) {
      await mockDelay(200)
      return structuredClone(mockAuditLogs).filter((item) =>
        AUDIT_CRUD_ACTIONS.has(item.action.toLowerCase()),
      )
    }
    const r = await apiGetData<{ items: AuditLogEntry[] }>('/admin/audit-logs', undefined, s)
    return r.items
      .filter((item) => AUDIT_CRUD_ACTIONS.has(item.action.toLowerCase()))
      .map((item) => ({
        id: item.id,
        at: item.at,
        actor: item.actor || 'Sistema',
        action: item.action,
        entity: item.entity,
        entityId: item.entityId ?? '',
        description: item.description || '',
        metadata: item.metadata,
      }))
  },

  async listParameters(): Promise<SystemParameter[]> {
    if (env.useMockApi) {
      await mockDelay(160)
      return structuredClone(mockParameters)
    }
    const r = await apiGetData<{ items: SystemParameter[] }>('/admin/parameters')
    return r.items
  },

  async listIntegrations(): Promise<IntegrationEndpoint[]> {
    if (env.useMockApi) {
      await mockDelay(170)
      return structuredClone(mockIntegrations)
    }
    const r = await apiGetData<{ items: IntegrationEndpoint[] }>('/admin/integrations')
    return r.items
  },

  async saveParameter(p: SystemParameter): Promise<{ ok: true }> {
    if (env.useMockApi) {
      await mockDelay(220)
      return { ok: true }
    }
    return apiPostData('/admin/parameters', p)
  },
}
