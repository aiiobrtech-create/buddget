import type { BudgetItem, Category, Company, CompanyGroup, CostCenter, LedgerClass } from '@/types/entities'

/** Grupo → Empresa */
export function buildCompanyCompositeCode(groupCode: string, companyCode: string): string {
  return `${groupCode}.${companyCode}`
}

/** Grupo → Empresa → Classe contábil */
export function buildLedgerClassCompositeCode(
  groupCode: string,
  companyCode: string,
  classCode: string,
): string {
  return `${groupCode}.${companyCode}.${classCode}`
}

/** Grupo → Empresa → Classe contábil → Categoria */
export function buildCategoryCompositeCode(
  groupCode: string,
  companyCode: string,
  classCode: string,
  categoryCode: string,
): string {
  return `${groupCode}.${companyCode}.${classCode}.${categoryCode}`
}

/** Grupo → Empresa → Classe → Categoria → Centro de custo → Item */
export function buildPlanningLineCode(parts: {
  groupCode: string
  companyCode: string
  classCode: string
  categoryCode: string
  costCenterCode: string
  itemCode?: string
}): string {
  const base = `${parts.groupCode}.${parts.companyCode}.${parts.classCode}.${parts.categoryCode}.${parts.costCenterCode}`
  return parts.itemCode ? `${base}.${parts.itemCode}` : base
}

export interface PlanningLineMasters {
  companies: Company[]
  companyGroups: CompanyGroup[]
  costCenters: CostCenter[]
  categories: Category[]
  classes: LedgerClass[]
  budgetItems?: BudgetItem[]
}

export type PlanningRowLookupInput = {
  companyId?: string
  classId?: string
  categoryId?: string
  costCenterId?: string
  itemId?: string
  costCenterCode?: string
  categoryCode?: string
  itemCode?: string
}

export function resolveCategoryFromPlanningRow(
  input: PlanningRowLookupInput,
  masters: PlanningLineMasters,
): Category | undefined {
  const categoryById = new Map(masters.categories.map((category) => [category.id, category]))
  if (input.categoryId) return categoryById.get(input.categoryId)
  if (input.categoryCode && input.classId) {
    return masters.categories.find(
      (category) => category.code === input.categoryCode && category.classId === input.classId,
    )
  }
  if (input.categoryCode) {
    return masters.categories.find((category) => category.code === input.categoryCode)
  }
  return undefined
}

export function resolveCostCenterFromPlanningRow(
  input: PlanningRowLookupInput,
  masters: PlanningLineMasters,
): CostCenter | undefined {
  const costCenterById = new Map(masters.costCenters.map((costCenter) => [costCenter.id, costCenter]))
  if (input.costCenterId) return costCenterById.get(input.costCenterId)

  const category = resolveCategoryFromPlanningRow(input, masters)
  const matches = input.costCenterCode
    ? masters.costCenters.filter((costCenter) => costCenter.code === input.costCenterCode)
    : []

  if (!matches.length) return undefined

  if (category) {
    const scoped = matches.filter((costCenter) => costCenter.categoryId === category.id)
    if (scoped.length === 1) return scoped[0]
    if (scoped.length > 1 && input.companyId) {
      return scoped.find((costCenter) => costCenter.companyId === input.companyId) ?? scoped[0]
    }
    if (scoped.length) return scoped[0]
  }

  if (input.companyId) {
    return matches.find((costCenter) => costCenter.companyId === input.companyId) ?? matches[0]
  }

  return matches[0]
}

export function resolveBudgetItemFromPlanningRow(
  input: PlanningRowLookupInput,
  masters: PlanningLineMasters,
): BudgetItem | undefined {
  const items = masters.budgetItems ?? []
  const itemById = new Map(items.map((item) => [item.id, item]))
  if (input.itemId) return itemById.get(input.itemId)

  const costCenter = resolveCostCenterFromPlanningRow(input, masters)
  const matches = input.itemCode
    ? items.filter((item) => item.code === input.itemCode)
    : []

  if (!matches.length) return undefined

  if (costCenter) {
    const scoped = matches.filter((item) => item.costCenterId === costCenter.id)
    if (scoped.length === 1) return scoped[0]
    if (scoped.length > 1 && input.companyId) {
      return scoped.find((item) => item.companyId === input.companyId) ?? scoped[0]
    }
    if (scoped.length) return scoped[0]
  }

  return matches[0]
}

export function resolvePlanningRowLabels(
  input: PlanningRowLookupInput & { costCenterCode: string; categoryCode: string },
  masters: PlanningLineMasters,
): { costCenterName: string; categoryName: string } {
  const category = resolveCategoryFromPlanningRow(input, masters)
  const costCenter = resolveCostCenterFromPlanningRow(
    { ...input, categoryId: category?.id ?? input.categoryId },
    masters,
  )

  return {
    costCenterName: costCenter?.name ?? '—',
    categoryName: category?.name ?? '—',
  }
}

export function resolvePlanningLineCodeFromMasters(
  input: PlanningRowLookupInput,
  masters: PlanningLineMasters,
  options?: { requireItem?: boolean },
): string {
  const companyById = new Map(masters.companies.map((c) => [c.id, c]))
  const groupById = new Map(masters.companyGroups.map((g) => [g.id, g]))
  const classById = new Map(masters.classes.map((c) => [c.id, c]))

  const category = resolveCategoryFromPlanningRow(input, masters)
  const costCenter = resolveCostCenterFromPlanningRow(
    { ...input, categoryId: category?.id ?? input.categoryId },
    masters,
  )
  const budgetItem = resolveBudgetItemFromPlanningRow(
    {
      ...input,
      categoryId: category?.id ?? input.categoryId,
      costCenterId: costCenter?.id ?? input.costCenterId,
    },
    masters,
  )

  const company =
    (input.companyId ? companyById.get(input.companyId) : undefined) ??
    (costCenter?.companyId ? companyById.get(costCenter.companyId) : undefined) ??
    masters.companies.find((c) => c.active)

  const ledgerClass = classById.get(input.classId ?? category?.classId ?? '')
  const group = company ? groupById.get(company.companyGroupId) : undefined

  if (!group || !company || !costCenter || !category || !ledgerClass) return '—'

  const itemCode = budgetItem?.code ?? input.itemCode
  if (options?.requireItem && !itemCode) return '—'

  return buildPlanningLineCode({
    groupCode: group.code,
    companyCode: company.code,
    classCode: ledgerClass.code,
    categoryCode: category.code,
    costCenterCode: costCenter.code,
    itemCode,
  })
}

export interface PlanningLineOption {
  code: string
  description: string
  companyId: string
  costCenterId: string
  categoryId: string
  classId: string
}

export function buildPlanningLineOptions(masters: PlanningLineMasters): PlanningLineOption[] {
  const companyById = new Map(masters.companies.map((c) => [c.id, c]))
  const groupById = new Map(masters.companyGroups.map((g) => [g.id, g]))
  const classById = new Map(masters.classes.map((c) => [c.id, c]))
  const categoryById = new Map(masters.categories.map((c) => [c.id, c]))
  const options: PlanningLineOption[] = []

  for (const costCenter of masters.costCenters.filter((c) => c.active)) {
    const category = categoryById.get(costCenter.categoryId)
    if (!category?.active) continue
    const ledgerClass = classById.get(category.classId)
    if (!ledgerClass) continue

    const company =
      (costCenter.companyId ? companyById.get(costCenter.companyId) : undefined) ??
      masters.companies.find((c) => c.active)
    if (!company?.active) continue
    const group = groupById.get(company.companyGroupId)
    if (!group?.active) continue

    options.push({
      code: buildPlanningLineCode({
        groupCode: group.code,
        companyCode: company.code,
        classCode: ledgerClass.code,
        categoryCode: category.code,
        costCenterCode: costCenter.code,
      }),
      description: `${costCenter.name} — ${category.name}`,
      companyId: company.id,
      costCenterId: costCenter.id,
      categoryId: category.id,
      classId: ledgerClass.id,
    })
  }

  return options.sort((a, b) => a.code.localeCompare(b.code))
}

export function findPlanningLineOption(
  options: PlanningLineOption[],
  input: {
    code?: string
    companyId?: string
    costCenterId?: string
    categoryId?: string
    classId?: string
  },
): PlanningLineOption | undefined {
  if (input.code) return options.find((o) => o.code === input.code)
  return options.find(
    (o) =>
      o.companyId === input.companyId &&
      o.costCenterId === input.costCenterId &&
      o.categoryId === input.categoryId &&
      (input.classId ? o.classId === input.classId : true),
  )
}

export interface PlanningRowSelection {
  companyId: string
  classId: string
  categoryId: string
  costCenterId: string
  itemId?: string
}

export function resolvePlanningRowSelection(
  input: PlanningRowLookupInput,
  masters: PlanningLineMasters,
): PlanningRowSelection {
  const category = resolveCategoryFromPlanningRow(input, masters)
  const costCenter = resolveCostCenterFromPlanningRow(
    { ...input, categoryId: category?.id ?? input.categoryId },
    masters,
  )
  const budgetItem = resolveBudgetItemFromPlanningRow(
    {
      ...input,
      categoryId: category?.id ?? input.categoryId,
      costCenterId: costCenter?.id ?? input.costCenterId,
    },
    masters,
  )
  const ledgerClass = masters.classes.find((c) => c.id === (input.classId ?? category?.classId))
  const company =
    masters.companies.find((c) => c.id === input.companyId) ??
    (costCenter?.companyId ? masters.companies.find((c) => c.id === costCenter.companyId) : undefined)

  return {
    companyId: company?.id ?? '',
    classId: ledgerClass?.id ?? '',
    categoryId: category?.id ?? '',
    costCenterId: costCenter?.id ?? '',
    itemId: budgetItem?.id ?? input.itemId ?? '',
  }
}

export function planningRowCodesFromSelection(
  selection: PlanningRowSelection,
  masters: PlanningLineMasters,
): { companyId: string; classId: string; categoryId: string; costCenterId: string; costCenterCode: string; categoryCode: string; itemId: string; itemCode: string } | null {
  const costCenter = masters.costCenters.find((c) => c.id === selection.costCenterId)
  const category = masters.categories.find((c) => c.id === selection.categoryId)
  const budgetItem = masters.budgetItems?.find((item) => item.id === selection.itemId)
  if (!selection.classId || !category || !costCenter || !selection.itemId || !budgetItem) return null
  if (category.classId !== selection.classId) return null
  if (costCenter.categoryId !== category.id) return null
  if (budgetItem.costCenterId !== costCenter.id) return null

  const companyId =
    selection.companyId ||
    costCenter.companyId ||
    budgetItem.companyId ||
    masters.companies.find((c) => c.active)?.id ||
    ''
  if (!companyId) return null
  if (costCenter.companyId && costCenter.companyId !== companyId) return null
  if (budgetItem.companyId && budgetItem.companyId !== companyId) return null

  return {
    companyId,
    classId: selection.classId,
    categoryId: category.id,
    costCenterId: costCenter.id,
    costCenterCode: costCenter.code,
    categoryCode: category.code,
    itemId: budgetItem.id,
    itemCode: budgetItem.code,
  }
}
