export function buildCompanyCompositeCode(groupCode: string, companyCode: string): string {
  return `${groupCode}.${companyCode}`;
}

export function buildLedgerClassCompositeCode(
  groupCode: string,
  companyCode: string,
  classCode: string,
): string {
  return `${groupCode}.${companyCode}.${classCode}`;
}

export function buildCategoryCompositeCode(
  groupCode: string,
  companyCode: string,
  classCode: string,
  categoryCode: string,
): string {
  return `${groupCode}.${companyCode}.${classCode}.${categoryCode}`;
}

export function buildPlanningLineCode(parts: {
  groupCode: string;
  companyCode: string;
  classCode: string;
  categoryCode: string;
  costCenterCode: string;
  itemCode?: string;
}): string {
  const base = `${parts.groupCode}.${parts.companyCode}.${parts.classCode}.${parts.categoryCode}.${parts.costCenterCode}`;
  return parts.itemCode ? `${base}.${parts.itemCode}` : base;
}

export function derivePlanningCompositeKeys(
  planningCode: string,
  ledgerClassCode: string,
  categoryCode: string,
): {
  groupCompositeCode: string;
  companyCompositeCode: string;
  ledgerCompositeCode: string;
  categoryCompositeCode: string;
  costCenterCompositeCode: string;
  itemCompositeCode?: string;
} {
  const parts = planningCode.split(".");
  if (parts.length >= 6) {
    return {
      groupCompositeCode: parts[0]!,
      companyCompositeCode: parts.slice(0, 2).join("."),
      ledgerCompositeCode: parts.slice(0, 3).join("."),
      categoryCompositeCode: parts.slice(0, 4).join("."),
      costCenterCompositeCode: parts.slice(0, 5).join("."),
      itemCompositeCode: parts.join("."),
    };
  }
  if (parts.length >= 5) {
    return {
      groupCompositeCode: parts[0]!,
      companyCompositeCode: parts.slice(0, 2).join("."),
      ledgerCompositeCode: parts.slice(0, 3).join("."),
      categoryCompositeCode: parts.slice(0, 4).join("."),
      costCenterCompositeCode: parts.join("."),
    };
  }
  return {
    groupCompositeCode: ledgerClassCode,
    companyCompositeCode: ledgerClassCode,
    ledgerCompositeCode: ledgerClassCode,
    categoryCompositeCode: `${ledgerClassCode}.${categoryCode}`,
    costCenterCompositeCode: planningCode,
  };
}

type CompanyWithGroup = {
  code: string;
  companyGroup: { code: string } | null;
};

type CostCenterRef = {
  code: string;
  name: string;
  companyId: string | null;
  categoryId: string;
};

type CategoryRef = {
  id: string;
  code: string;
  name: string;
  classId: string;
};

type LedgerClassRef = {
  id: string;
  code: string;
  name: string;
  companyId?: string;
};

type BudgetItemRef = {
  id: string;
  code: string;
  name: string;
};

export type PlanningLinePresentation = {
  groupCompositeCode: string;
  companyCompositeCode: string;
  ledgerCompositeCode: string;
  categoryCompositeCode: string;
  costCenterCompositeCode: string;
  planningCode: string;
  itemCompositeCode?: string;
};

export function resolvePlanningLinePresentation(
  costCenter: CostCenterRef,
  category: CategoryRef,
  ledgerClass: LedgerClassRef,
  companyById: Map<string, CompanyWithGroup>,
  defaultCompany?: CompanyWithGroup,
  lineCompanyId?: string,
  budgetItem?: BudgetItemRef | null,
): PlanningLinePresentation | null {
  const company =
    (lineCompanyId ? companyById.get(lineCompanyId) : undefined) ??
    (ledgerClass.companyId ? companyById.get(ledgerClass.companyId) : undefined) ??
    (costCenter.companyId ? companyById.get(costCenter.companyId) : undefined) ??
    defaultCompany;
  if (!company) return null;

  if (!company.companyGroup) {
    const planningCode = budgetItem
      ? `${ledgerClass.code}.${category.code}.${costCenter.code}.${budgetItem.code}`
      : `${ledgerClass.code}.${category.code}.${costCenter.code}`;
    const keys = derivePlanningCompositeKeys(planningCode, ledgerClass.code, category.code);
    return {
      planningCode,
      ...keys,
      itemCompositeCode: budgetItem ? planningCode : undefined,
    };
  }

  const costCenterCompositeCode = buildPlanningLineCode({
    groupCode: company.companyGroup.code,
    companyCode: company.code,
    classCode: ledgerClass.code,
    categoryCode: category.code,
    costCenterCode: costCenter.code,
  });
  const itemCompositeCode = budgetItem
    ? buildPlanningLineCode({
        groupCode: company.companyGroup.code,
        companyCode: company.code,
        classCode: ledgerClass.code,
        categoryCode: category.code,
        costCenterCode: costCenter.code,
        itemCode: budgetItem.code,
      })
    : undefined;
  const keys = derivePlanningCompositeKeys(costCenterCompositeCode, ledgerClass.code, category.code);
  return {
    planningCode: costCenterCompositeCode,
    ...keys,
    costCenterCompositeCode,
    itemCompositeCode,
  };
}

export function listRegisteredPlanningLineContexts(input: {
  costCenters: Array<CostCenterRef & { id: string }>;
  categories: CategoryRef[];
  ledgerClasses: LedgerClassRef[];
  defaultCompanyId?: string;
  companyIds?: string[];
  ledgerClassIds?: string[];
  budgetCategoryIds?: string[];
  costCenterIds?: string[];
}): Array<{
  companyId: string;
  costCenterId: string;
  budgetCategoryId: string;
  ledgerClassId: string;
}> {
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const ledgerClassById = new Map(input.ledgerClasses.map((ledgerClass) => [ledgerClass.id, ledgerClass]));
  const contexts: Array<{
    companyId: string;
    costCenterId: string;
    budgetCategoryId: string;
    ledgerClassId: string;
  }> = [];

  for (const costCenter of input.costCenters) {
    if (input.costCenterIds?.length && !input.costCenterIds.includes(costCenter.id)) continue;

    const category = categoryById.get(costCenter.categoryId);
    if (!category) continue;
    if (input.budgetCategoryIds?.length && !input.budgetCategoryIds.includes(category.id)) continue;

    const ledgerClass = ledgerClassById.get(category.classId);
    if (!ledgerClass) continue;
    if (input.ledgerClassIds?.length && !input.ledgerClassIds.includes(ledgerClass.id)) continue;

    const companyId = costCenter.companyId ?? input.defaultCompanyId;
    if (!companyId) continue;
    if (input.companyIds?.length && !input.companyIds.includes(companyId)) continue;

    contexts.push({
      companyId,
      costCenterId: costCenter.id,
      budgetCategoryId: category.id,
      ledgerClassId: ledgerClass.id,
    });
  }

  return contexts;
}

export function listRegisteredPlanningLineItemContexts(input: {
  costCenters: Array<CostCenterRef & { id: string }>;
  categories: CategoryRef[];
  ledgerClasses: LedgerClassRef[];
  budgetItems?: Array<BudgetItemRef & { costCenterId: string; companyId?: string | null }>;
  defaultCompanyId?: string;
  companyIds?: string[];
  ledgerClassIds?: string[];
  budgetCategoryIds?: string[];
  costCenterIds?: string[];
}): Array<{
  companyId: string;
  costCenterId: string;
  budgetCategoryId: string;
  ledgerClassId: string;
  budgetItemId: string | null;
}> {
  const itemsByCostCenter = new Map<string, Array<BudgetItemRef & { costCenterId: string; companyId?: string | null }>>();
  for (const item of input.budgetItems ?? []) {
    const bucket = itemsByCostCenter.get(item.costCenterId) ?? [];
    bucket.push(item);
    itemsByCostCenter.set(item.costCenterId, bucket);
  }

  const contexts: Array<{
    companyId: string;
    costCenterId: string;
    budgetCategoryId: string;
    ledgerClassId: string;
    budgetItemId: string | null;
  }> = [];

  for (const base of listRegisteredPlanningLineContexts(input)) {
    const items = itemsByCostCenter.get(base.costCenterId) ?? [];
    if (!items.length) {
      contexts.push({ ...base, budgetItemId: null });
      continue;
    }
    contexts.push({ ...base, budgetItemId: null });
    for (const item of items) {
      const companyId = item.companyId ?? base.companyId;
      if (input.companyIds?.length && !input.companyIds.includes(companyId)) continue;
      contexts.push({
        ...base,
        companyId,
        budgetItemId: item.id,
      });
    }
  }

  return contexts;
}
