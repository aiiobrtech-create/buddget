import { prisma } from "../../config/prisma";
import { resolveBudgetVersionId } from "../budgets/version-resolver";
import { percentageExecution } from "../../common/utils/math";
import { resolvePlanningLinePresentation, listRegisteredPlanningLineItemContexts } from "../../common/utils/planning-line-code";
import { NATURE_SECTIONS, resolveNatureSection, type NatureSectionId } from "./budget-nature";

type BudgetHealth = "ok" | "attention" | "over";

export type ComparativeQuery = {
  year?: number;
  yearIds?: string[];
  monthIds?: string[];
  companyIds?: string[];
  classIds?: string[];
  costCenterIds?: string[];
  categoryIds?: string[];
  budgetIds?: string[];
  versionId?: string;
};

export type ComparativeRow = {
  id: string;
  label: string;
  level: number;
  parentId?: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
  balance: number;
  health: BudgetHealth;
  code?: string;
  children?: ComparativeRow[];
};

type Amounts = { budgeted: number; actual: number };

type ItemLeaf = Amounts & {
  itemCompositeCode: string;
  itemName: string;
};

type CostCenterBucket = Amounts & {
  costCenterCompositeCode: string;
  costCenterName: string;
  items: Map<string, ItemLeaf>;
};

type CategoryBucket = {
  categoryCompositeCode: string;
  categoryName: string;
  costCenters: Map<string, CostCenterBucket>;
};

type LedgerBucket = {
  ledgerCompositeCode: string;
  ledgerClassName: string;
  categories: Map<string, CategoryBucket>;
};

type CompanyBucket = {
  companyCompositeCode: string;
  companyName: string;
  ledgerClasses: Map<string, LedgerBucket>;
};

type GroupBucket = {
  groupCompositeCode: string;
  groupName: string;
  companies: Map<string, CompanyBucket>;
};

/** section → group → company → class → category → cost center → item */
type SectionTree = Map<string, GroupBucket>;

function sanitizeCodeForId(code: string): string {
  return code.replace(/\./g, "_");
}

function sumAmounts(rows: ComparativeRow[]): Amounts {
  return rows.reduce(
    (acc, row) => ({
      budgeted: acc.budgeted + row.budgeted,
      actual: acc.actual + row.actual,
    }),
    { budgeted: 0, actual: 0 },
  );
}

function buildItemRows(
  costCenter: CostCenterBucket,
  parentId: string,
  sectionId: string,
): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const leaf of costCenter.items.values()) {
    rows.push(
      toComparisonRow(
        `section-${sectionId}-item-${sanitizeCodeForId(leaf.itemCompositeCode)}`,
        leaf.itemName,
        7,
        leaf.budgeted,
        leaf.actual,
        parentId,
        undefined,
        leaf.itemCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function buildCostCenterRows(
  category: CategoryBucket,
  parentId: string,
  sectionId: string,
): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const costCenter of category.costCenters.values()) {
    const ccId = `section-${sectionId}-cc-${sanitizeCodeForId(costCenter.costCenterCompositeCode)}`;
    const itemRows = buildItemRows(costCenter, ccId, sectionId);
    const itemTotals = sumAmounts(itemRows);
    const totals = {
      budgeted: itemTotals.budgeted + costCenter.budgeted,
      actual: itemTotals.actual + costCenter.actual,
    };
    rows.push(
      toComparisonRow(
        ccId,
        costCenter.costCenterName,
        6,
        totals.budgeted,
        totals.actual,
        parentId,
        itemRows,
        costCenter.costCenterCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function buildCategoryRows(ledger: LedgerBucket, parentId: string, sectionId: string): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const category of ledger.categories.values()) {
    const catId = `section-${sectionId}-cat-${sanitizeCodeForId(category.categoryCompositeCode)}`;
    const ccRows = buildCostCenterRows(category, catId, sectionId);
    const totals = sumAmounts(ccRows);
    rows.push(
      toComparisonRow(
        catId,
        category.categoryName,
        5,
        totals.budgeted,
        totals.actual,
        parentId,
        ccRows,
        category.categoryCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function buildLedgerRows(company: CompanyBucket, parentId: string, sectionId: string): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const ledger of company.ledgerClasses.values()) {
    const ledgerId = `section-${sectionId}-ledger-${sanitizeCodeForId(ledger.ledgerCompositeCode)}`;
    const categoryRows = buildCategoryRows(ledger, ledgerId, sectionId);
    const totals = sumAmounts(categoryRows);
    rows.push(
      toComparisonRow(
        ledgerId,
        ledger.ledgerClassName,
        4,
        totals.budgeted,
        totals.actual,
        parentId,
        categoryRows,
        ledger.ledgerCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function buildCompanyRows(group: GroupBucket, parentId: string, sectionId: string): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const company of group.companies.values()) {
    const companyId = `section-${sectionId}-company-${sanitizeCodeForId(company.companyCompositeCode)}`;
    const ledgerRows = buildLedgerRows(company, companyId, sectionId);
    const totals = sumAmounts(ledgerRows);
    rows.push(
      toComparisonRow(
        companyId,
        company.companyName,
        3,
        totals.budgeted,
        totals.actual,
        parentId,
        ledgerRows,
        company.companyCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function buildGroupRows(sectionMap: SectionTree, parentId: string, sectionId: string): ComparativeRow[] {
  const rows: ComparativeRow[] = [];
  for (const group of sectionMap.values()) {
    const groupId = `section-${sectionId}-group-${sanitizeCodeForId(group.groupCompositeCode)}`;
    const companyRows = buildCompanyRows(group, groupId, sectionId);
    const totals = sumAmounts(companyRows);
    rows.push(
      toComparisonRow(
        groupId,
        group.groupName,
        2,
        totals.budgeted,
        totals.actual,
        parentId,
        companyRows,
        group.groupCompositeCode,
      ),
    );
  }
  rows.sort((a, b) => (a.code ?? a.label).localeCompare(b.code ?? b.label, "pt-BR"));
  return rows;
}

function parseIdList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined;
  const ids = values.map((v) => v.trim()).filter((v) => v && v !== "all");
  return ids.length ? ids : undefined;
}

function parseMonthList(values?: string[]): number[] | undefined {
  const ids = parseIdList(values);
  if (!ids?.length) return undefined;
  const months = ids.map((v) => Number(v)).filter((m) => m >= 1 && m <= 12);
  return months.length ? months : undefined;
}

function resolveYear(query: ComparativeQuery): number {
  const fromIds = query.yearIds?.map((v) => Number(v)).find((y) => Number.isFinite(y) && y >= 2000);
  if (fromIds) return fromIds;
  if (query.year && Number.isFinite(query.year)) return query.year;
  return new Date().getFullYear();
}

function healthFromExecutionPct(pct: number): BudgetHealth {
  if (pct > 105) return "over";
  if (pct < 95 && pct >= 85) return "attention";
  return "ok";
}

function toComparisonRow(
  id: string,
  label: string,
  level: number,
  budgeted: number,
  actual: number,
  parentId?: string,
  children?: ComparativeRow[],
  code?: string,
): ComparativeRow {
  const variance = actual - budgeted;
  const variancePct = percentageExecution(budgeted, actual);
  return {
    id,
    label,
    level,
    parentId,
    budgeted,
    actual,
    variance,
    variancePct,
    balance: budgeted - actual,
    health: healthFromExecutionPct(variancePct),
    code,
    children,
  };
}

export function parseComparativeQuery(raw: Record<string, unknown>): ComparativeQuery {
  const pickList = (key: string) => {
    const value = raw[key];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
    if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
    return undefined;
  };

  const pickSingleAsList = (key: string) => {
    const value = raw[key];
    return typeof value === "string" && value.trim() ? [value.trim()] : undefined;
  };

  return {
    year: Number(raw.year),
    yearIds: pickList("yearIds"),
    monthIds: pickList("monthIds"),
    companyIds: pickList("companyIds") ?? pickSingleAsList("companyId"),
    classIds: pickList("classIds"),
    costCenterIds: pickList("costCenterIds"),
    categoryIds: pickList("categoryIds"),
    budgetIds: pickList("budgetIds") ?? pickSingleAsList("budgetId"),
    versionId: typeof raw.versionId === "string" ? raw.versionId : undefined,
  };
}

export type ReportScope = {
  year: number;
  months?: number[];
  classIds?: string[];
  lineWhere: Record<string, unknown>;
  actualWhere: Record<string, unknown>;
};

export interface AccessRestrictions {
  companyIds?: string[];
  costCenterIds?: string[];
  classIds?: string[];
  categoryIds?: string[];
  budgetItemIds?: string[];
}

export async function buildReportScope(query: ComparativeQuery, access?: AccessRestrictions): Promise<ReportScope> {
  const year = resolveYear(query);
  const months = parseMonthList(query.monthIds);
  const companyIds = parseIdList(query.companyIds);
  const classIds = parseIdList(query.classIds);
  const costCenterIds = parseIdList(query.costCenterIds);
  const categoryIds = parseIdList(query.categoryIds);
  const budgetId = parseIdList(query.budgetIds)?.[0];
  const versionId =
    query.versionId ?? (budgetId ? await resolveBudgetVersionId({ budgetId }) : undefined);

  const lineWhere: Record<string, unknown> = {
    version: { budget: { year } },
  };
  const actualWhere: Record<string, unknown> = {
    competenceDate: {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    },
  };

  if (companyIds) {
    if (access?.companyIds) {
      const allowed = companyIds.filter((id) => access.companyIds!.includes(id));
      lineWhere.companyId = { in: allowed };
      actualWhere.companyId = { in: allowed };
    } else {
      lineWhere.companyId = { in: companyIds };
      actualWhere.companyId = { in: companyIds };
    }
  } else if (access?.companyIds) {
    lineWhere.companyId = { in: access.companyIds };
    actualWhere.companyId = { in: access.companyIds };
  }

  if (months) {
    lineWhere.referenceMonth = { in: months };
  }

  if (classIds) {
    if (access?.classIds) {
      const allowed = classIds.filter((id) => access.classIds!.includes(id));
      lineWhere.categoryId = { in: allowed };
      actualWhere.categoryId = { in: allowed };
    } else {
      lineWhere.categoryId = { in: classIds };
      actualWhere.categoryId = { in: classIds };
    }
  } else if (access?.classIds) {
    lineWhere.categoryId = { in: access.classIds };
    actualWhere.categoryId = { in: access.classIds };
  }

  if (categoryIds) {
    if (access?.categoryIds) {
      const allowed = categoryIds.filter((id) => access.categoryIds!.includes(id));
      lineWhere.classId = { in: allowed };
      actualWhere.classId = { in: allowed };
    } else {
      lineWhere.classId = { in: categoryIds };
      actualWhere.classId = { in: categoryIds };
    }
  } else if (access?.categoryIds) {
    lineWhere.classId = { in: access.categoryIds };
    actualWhere.classId = { in: access.categoryIds };
  }

  if (costCenterIds) {
    if (access?.costCenterIds) {
      const allowed = costCenterIds.filter((id) => access.costCenterIds!.includes(id));
      lineWhere.costCenterId = { in: allowed };
      actualWhere.costCenterId = { in: allowed };
    } else {
      lineWhere.costCenterId = { in: costCenterIds };
      actualWhere.costCenterId = { in: costCenterIds };
    }
  } else if (access?.costCenterIds) {
    lineWhere.costCenterId = { in: access.costCenterIds };
    actualWhere.costCenterId = { in: access.costCenterIds };
  }

  if (access?.budgetItemIds?.length) {
    lineWhere.budgetItemId = { in: access.budgetItemIds };
    actualWhere.budgetItemId = { in: access.budgetItemIds };
  }

  if (versionId) {
    lineWhere.versionId = versionId;
  }

  return { year, months, classIds, lineWhere, actualWhere };
}

/** empresa + classe contábil + categoria + centro de custo + item (opcional) */
function budgetLineKey(
  companyId: string,
  costCenterId: string,
  budgetCategoryId: string,
  ledgerClassId: string,
  budgetItemId?: string | null,
) {
  return `${companyId}|${costCenterId}|${budgetCategoryId}|${ledgerClassId}|${budgetItemId ?? ""}`;
}

export async function comparativeReport(rawQuery: Record<string, unknown>, access?: AccessRestrictions): Promise<{ rows: ComparativeRow[] }> {
  const query = parseComparativeQuery(rawQuery);
  const { months, lineWhere, actualWhere } = await buildReportScope(query, access);
  const companyIds = parseIdList(query.companyIds);
  const classIds = parseIdList(query.classIds);
  const categoryIds = parseIdList(query.categoryIds);
  const costCenterIds = parseIdList(query.costCenterIds);

  const [plannedRows, actualRows, costCenters, budgetCategories, ledgerClasses, companies, budgetItems] =
    await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["companyId", "costCenterId", "classId", "categoryId", "budgetItemId"],
      where: lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: actualWhere,
      select: {
        companyId: true,
        costCenterId: true,
        budgetItemId: true,
        classId: true,
        categoryId: true,
        amount: true,
        competenceDate: true,
      },
    }),
    prisma.costCenter.findMany({ orderBy: [{ code: "asc" }] }),
    prisma.budgetClass.findMany({ orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    prisma.budgetCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    prisma.company.findMany({ include: { companyGroup: true } }),
    prisma.budgetItem.findMany({ where: { status: "ACTIVE" }, orderBy: [{ costCenterId: "asc" }, { code: "asc" }] }),
  ]);

  const costCenterById = new Map(costCenters.map((cc) => [cc.id, cc]));
  const budgetCategoryById = new Map(budgetCategories.map((row) => [row.id, row]));
  const ledgerClassById = new Map(ledgerClasses.map((row) => [row.id, row]));
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const budgetItemById = new Map(budgetItems.map((item) => [item.id, item]));
  const defaultCompany = companies.find((c) => c.status === "ACTIVE") ?? companies[0];

  const plannedMap = new Map<string, number>();
  for (const row of plannedRows) {
    plannedMap.set(
      budgetLineKey(row.companyId, row.costCenterId, row.classId, row.categoryId, row.budgetItemId),
      Number(row._sum.plannedAmount ?? 0),
    );
  }

  const actualMap = new Map<string, number>();
  for (const row of actualRows) {
    if (months) {
      const month = row.competenceDate.getUTCMonth() + 1;
      if (!months.includes(month)) continue;
    }
    const key = budgetLineKey(row.companyId, row.costCenterId, row.classId, row.categoryId, row.budgetItemId);
    actualMap.set(key, (actualMap.get(key) ?? 0) + Number(row.amount.toString()));
  }

  const launchedKeys = new Set<string>([...plannedMap.keys(), ...actualMap.keys()]);
  const keys = new Set<string>(launchedKeys);
  const registeredKeySet = new Set<string>();

  const registeredContexts = listRegisteredPlanningLineItemContexts({
    costCenters,
    categories: budgetCategories,
    ledgerClasses,
    budgetItems,
    defaultCompanyId: defaultCompany?.id,
    companyIds,
    ledgerClassIds: classIds,
    budgetCategoryIds: categoryIds,
    costCenterIds,
  });
  for (const context of registeredContexts) {
    const registeredKey = budgetLineKey(
      context.companyId,
      context.costCenterId,
      context.budgetCategoryId,
      context.ledgerClassId,
      context.budgetItemId,
    );
    registeredKeySet.add(registeredKey);
    keys.add(registeredKey);
  }

  const bySection: Map<NatureSectionId, SectionTree> = new Map();

  for (const key of keys) {
    const [companyId, costCenterId, budgetCategoryId, ledgerClassId, budgetItemIdRaw] = key.split("|");
    const budgetItemId = budgetItemIdRaw || null;
    const costCenter = costCenterById.get(costCenterId);
    const category = budgetCategoryById.get(budgetCategoryId);
    const ledgerClass = ledgerClassById.get(ledgerClassId);
    const budgetItem = budgetItemId ? budgetItemById.get(budgetItemId) : undefined;
    if (!costCenter || !category || !ledgerClass) continue;
    if (budgetItemId && !budgetItem) continue;

    const budgeted = plannedMap.get(key) ?? 0;
    const actual = actualMap.get(key) ?? 0;
    if (budgeted === 0 && actual === 0 && !registeredKeySet.has(key)) continue;

    const company = companyById.get(companyId);
    const presentation = resolvePlanningLinePresentation(
      costCenter,
      category,
      ledgerClass,
      companyById,
      defaultCompany,
      companyId,
      budgetItem,
    );
    if (!presentation || !company?.companyGroup) continue;

    const sectionId = resolveNatureSection(ledgerClass.name, ledgerClass.description ?? "Despesa");
    const sectionMap = bySection.get(sectionId) ?? new Map<string, GroupBucket>();

    const groupBucket =
      sectionMap.get(presentation.groupCompositeCode) ??
      ({
        groupCompositeCode: presentation.groupCompositeCode,
        groupName: company.companyGroup.name,
        companies: new Map<string, CompanyBucket>(),
      } satisfies GroupBucket);

    const companyBucket =
      groupBucket.companies.get(presentation.companyCompositeCode) ??
      ({
        companyCompositeCode: presentation.companyCompositeCode,
        companyName: company.name,
        ledgerClasses: new Map<string, LedgerBucket>(),
      } satisfies CompanyBucket);

    const ledgerBucket =
      companyBucket.ledgerClasses.get(presentation.ledgerCompositeCode) ??
      ({
        ledgerCompositeCode: presentation.ledgerCompositeCode,
        ledgerClassName: ledgerClass.name,
        categories: new Map<string, CategoryBucket>(),
      } satisfies LedgerBucket);

    const categoryBucket =
      ledgerBucket.categories.get(presentation.categoryCompositeCode) ??
      ({
        categoryCompositeCode: presentation.categoryCompositeCode,
        categoryName: category.name,
        costCenters: new Map<string, CostCenterBucket>(),
      } satisfies CategoryBucket);

    const costCenterBucket =
      categoryBucket.costCenters.get(presentation.costCenterCompositeCode) ??
      ({
        costCenterCompositeCode: presentation.costCenterCompositeCode,
        costCenterName: costCenter.name,
        budgeted: 0,
        actual: 0,
        items: new Map<string, ItemLeaf>(),
      } satisfies CostCenterBucket);

    if (presentation.itemCompositeCode && budgetItem) {
      const prevItem = costCenterBucket.items.get(presentation.itemCompositeCode);
      costCenterBucket.items.set(presentation.itemCompositeCode, {
        itemCompositeCode: presentation.itemCompositeCode,
        itemName: budgetItem.name,
        budgeted: (prevItem?.budgeted ?? 0) + budgeted,
        actual: (prevItem?.actual ?? 0) + actual,
      });
    } else {
      costCenterBucket.budgeted += budgeted;
      costCenterBucket.actual += actual;
    }

    categoryBucket.costCenters.set(presentation.costCenterCompositeCode, costCenterBucket);
    ledgerBucket.categories.set(presentation.categoryCompositeCode, categoryBucket);
    companyBucket.ledgerClasses.set(presentation.ledgerCompositeCode, ledgerBucket);
    groupBucket.companies.set(presentation.companyCompositeCode, companyBucket);
    sectionMap.set(presentation.groupCompositeCode, groupBucket);
    bySection.set(sectionId, sectionMap);
  }

  const sectionNodes: ComparativeRow[] = [];

  for (const section of NATURE_SECTIONS) {
    const sectionMap = bySection.get(section.id);
    if (!sectionMap?.size) continue;

    const groupNodes = buildGroupRows(sectionMap, `section-${section.id}`, section.id);
    const sectionTotals = sumAmounts(groupNodes);

    sectionNodes.push(
      toComparisonRow(
        `section-${section.id}`,
        section.title,
        1,
        sectionTotals.budgeted,
        sectionTotals.actual,
        "root",
        groupNodes,
      ),
    );
  }

  if (!sectionNodes.length) {
    return { rows: [] };
  }

  const rootBudgeted = sectionNodes.reduce((sum, row) => sum + row.budgeted, 0);
  const rootActual = sectionNodes.reduce((sum, row) => sum + row.actual, 0);

  return {
    rows: [
      toComparisonRow(
        "root",
        "Consolidado orçado × realizado",
        0,
        rootBudgeted,
        rootActual,
        undefined,
        sectionNodes,
      ),
    ],
  };
}
