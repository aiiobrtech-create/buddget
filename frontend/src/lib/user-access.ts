import type { UserAccessScope } from '@/types/entities'

export const EMPTY_USER_ACCESS: UserAccessScope = {
  companyGroupIds: [],
  companyIds: [],
  classIds: [],
  categoryIds: [],
  costCenterIds: [],
  budgetItemIds: [],
}

/** Garante todos os campos de escopo (sessões antigas podem omitir chaves novas). */
export function normalizeUserAccess(scope?: Partial<UserAccessScope> | null): UserAccessScope {
  if (!scope) return { ...EMPTY_USER_ACCESS }
  return {
    companyGroupIds: scope.companyGroupIds ?? [],
    companyIds: scope.companyIds ?? [],
    classIds: scope.classIds ?? [],
    categoryIds: scope.categoryIds ?? [],
    costCenterIds: scope.costCenterIds ?? [],
    budgetItemIds: scope.budgetItemIds ?? [],
  }
}

export function hasUserAccess(scope?: UserAccessScope): boolean {
  const access = normalizeUserAccess(scope)
  return (
    access.companyGroupIds.length > 0 ||
    access.companyIds.length > 0 ||
    access.classIds.length > 0 ||
    access.categoryIds.length > 0 ||
    access.costCenterIds.length > 0 ||
    access.budgetItemIds.length > 0
  )
}
