import { prisma } from "../../config/prisma";
import { NotFoundError, ValidationError } from "../../common/errors/app-error";
import * as actualService from "../actuals/service";
import { getUserAccess } from "../users/access-scopes";
import * as budgetLineService from "../budget-lines/service";
import { buildExecutiveDashboard } from "../dashboard/executive-dashboard";
import {
  createForecastRevision,
  deleteForecastRevision,
  updateForecastRevision,
} from "../dashboard/forecast-revisions";
import * as forecastService from "../dashboard/forecast-revisions";
import { budgetResumo } from "../dashboard/budget-resumo";
import { comparativeReport } from "../dashboard/comparative-report";
import { mapActualToFrontend } from "../masters-bridge/mappers";

export async function resolveAccessRestrictions(userId?: string, roleCode?: string) {
  if (!userId || roleCode === "ADMIN") return undefined;

  const access = await getUserAccess(userId);

  // Resolve Company Group IDs to Company IDs
  let groupCompanyIds: string[] = [];
  if (access.companyGroupIds && access.companyGroupIds.length > 0) {
    const companies = await prisma.company.findMany({
      where: { companyGroupId: { in: access.companyGroupIds } },
      select: { id: true },
    });
    groupCompanyIds = companies.map((c) => c.id);
  }

  let allowedCompanyIds: string[] | undefined = undefined;
  if (access.companyIds && access.companyIds.length > 0) {
    allowedCompanyIds = access.companyIds;
    if (groupCompanyIds.length > 0) {
      allowedCompanyIds = [...new Set([...allowedCompanyIds, ...groupCompanyIds])];
    }
  } else if (groupCompanyIds.length > 0) {
    allowedCompanyIds = groupCompanyIds;
  }

  return {
    companyIds: allowedCompanyIds,
    costCenterIds: access.costCenterIds?.length ? access.costCenterIds : undefined,
    classIds: access.classIds?.length ? access.classIds : undefined,
    categoryIds: access.categoryIds?.length ? access.categoryIds : undefined,
    budgetItemIds: access.budgetItemIds?.length ? access.budgetItemIds : undefined,
  };
}

export async function getPlanningTable(versionId: string, userId?: string, roleCode?: string) {
  const lines = await budgetLineService.listBudgetLines(versionId);
  const costCenters = await prisma.costCenter.findMany();
  const categories = await prisma.budgetClass.findMany();
  const budgetItems = await prisma.budgetItem.findMany();
  const ccById = new Map(costCenters.map((c) => [c.id, c]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const itemById = new Map(budgetItems.map((item) => [item.id, item]));

  let filteredLines = lines;
  if (roleCode && roleCode !== "ADMIN" && userId) {
    const access = await resolveAccessRestrictions(userId, roleCode);
    if (access?.companyIds && access.companyIds.length > 0) {
      const allowed = new Set(access.companyIds);
      filteredLines = filteredLines.filter((line) => line.companyId && allowed.has(line.companyId));
    }
    if (access?.costCenterIds && access.costCenterIds.length > 0) {
      const allowed = new Set(access.costCenterIds);
      filteredLines = filteredLines.filter((line) => line.costCenterId && allowed.has(line.costCenterId));
    }
    if (access?.classIds && access.classIds.length > 0) {
      const allowed = new Set(access.classIds);
      filteredLines = filteredLines.filter((line) => line.categoryId && allowed.has(line.categoryId));
    }
    if (access?.categoryIds && access.categoryIds.length > 0) {
      const allowed = new Set(access.categoryIds);
      filteredLines = filteredLines.filter((line) => line.classId && allowed.has(line.classId));
    }
    if (access?.budgetItemIds && access.budgetItemIds.length > 0) {
      const allowed = new Set(access.budgetItemIds);
      filteredLines = filteredLines.filter((line) => line.budgetItemId && allowed.has(line.budgetItemId));
    }
  }

  return {
    rows: filteredLines.map((line) => ({
      id: line.id,
      month: line.referenceMonth,
      companyId: line.companyId,
      classId: line.categoryId,
      categoryId: line.classId,
      costCenterId: line.costCenterId,
      costCenterCode: ccById.get(line.costCenterId)?.code ?? "",
      categoryCode: catById.get(line.classId)?.code ?? "",
      itemId: line.budgetItemId ?? undefined,
      itemCode: line.budgetItemId ? (itemById.get(line.budgetItemId)?.code ?? "") : "",
      plannedAmount: Number(line.plannedAmount.toString()),
    })),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function resolveCostCenter(
  costCenters: Array<{ id: string; code: string; companyId: string | null; categoryId: string }>,
  raw: Record<string, unknown>,
) {
  const byId = raw.costCenterId ? costCenters.find((c) => c.id === String(raw.costCenterId)) : undefined;
  if (byId) return byId;

  const code = String(raw.costCenterCode ?? "");
  const companyId = raw.companyId ? String(raw.companyId) : undefined;
  const categoryId = raw.categoryId ? String(raw.categoryId) : undefined;
  const matches = costCenters.filter((c) => c.code === code);
  if (!matches.length) return undefined;
  if (categoryId) {
    const scoped = matches.filter((c) => c.categoryId === categoryId);
    if (scoped.length === 1) return scoped[0];
    if (scoped.length > 1 && companyId) {
      return scoped.find((c) => c.companyId === companyId) ?? scoped[0];
    }
    if (scoped.length) return scoped[0];
  }
  if (companyId) {
    return matches.find((c) => c.companyId === companyId) ?? matches[0];
  }
  return matches[0];
}

function resolveCategory(
  categories: Array<{ id: string; code: string; classId: string }>,
  raw: Record<string, unknown>,
) {
  const byId = raw.categoryId ? categories.find((c) => c.id === String(raw.categoryId)) : undefined;
  if (byId) return byId;

  const code = String(raw.categoryCode ?? "");
  const classId = raw.classId ? String(raw.classId) : undefined;
  if (code && classId) {
    return categories.find((c) => c.code === code && c.classId === classId);
  }
  return categories.find((c) => c.code === code);
}

function resolveBudgetItem(
  budgetItems: Array<{ id: string; code: string; costCenterId: string; companyId: string | null }>,
  raw: Record<string, unknown>,
  costCenterId: string,
) {
  const byId = raw.itemId
    ? budgetItems.find((item) => item.id === String(raw.itemId))
    : raw.budgetItemId
      ? budgetItems.find((item) => item.id === String(raw.budgetItemId))
      : undefined;
  if (byId) return byId;

  const code = String(raw.itemCode ?? "").trim();
  if (!code) return undefined;
  return budgetItems.find((item) => item.costCenterId === costCenterId && item.code === code);
}

function resolveCompanyId(
  raw: Record<string, unknown>,
  cc: { companyId: string | null },
  budgetCompanyId: string,
): string | undefined {
  for (const candidate of [raw.companyId, cc.companyId, budgetCompanyId]) {
    if (candidate == null) continue;
    const id = String(candidate).trim();
    if (id) return id;
  }
  return undefined;
}

async function resolveNature(classId: string) {
  const existing = await prisma.budgetNature.findFirst({
    where: { classId },
    orderBy: { displayOrder: "asc" },
  });
  if (existing) return existing;

  return prisma.budgetNature.upsert({
    where: { classId_code: { classId, code: "1" } },
    create: { classId, code: "1", name: "Padrão", displayOrder: 1 },
    update: {},
  });
}

export async function savePlanningDraft(versionId: string, lines: Array<Record<string, unknown>>) {
  const version = await prisma.budgetVersion.findUnique({
    where: { id: versionId },
    include: { budget: true },
  });
  if (!version) throw new NotFoundError("Budget version not found");

  const costCenters = await prisma.costCenter.findMany();
  const categories = await prisma.budgetClass.findMany();
  const budgetItems = await prisma.budgetItem.findMany({ where: { status: "ACTIVE" } });
  const errors: string[] = [];
  let saved = 0;
  const savedLineIds: string[] = [];

  for (const raw of lines) {
    const rawId = raw.id ? String(raw.id) : "";
    const hasItem = Boolean(raw.itemId ?? raw.budgetItemId ?? raw.itemCode);

    if (!hasItem) {
      if (rawId && isUuid(rawId)) {
        const keep = await prisma.budgetLine.findFirst({ where: { id: rawId, versionId } });
        if (keep) savedLineIds.push(keep.id);
      }
      continue;
    }

    const existingById =
      rawId && isUuid(rawId)
        ? await prisma.budgetLine.findFirst({ where: { id: rawId, versionId } })
        : null;

    let cc =
      resolveCostCenter(costCenters, raw) ??
      (existingById ? costCenters.find((center) => center.id === existingById.costCenterId) : undefined);

    const cat = resolveCategory(categories, raw);
    if (!cc) {
      errors.push(`Centro de custo "${String(raw.costCenterCode ?? raw.costCenterId ?? "")}" não encontrado`);
      continue;
    }
    if (!cat) {
      errors.push(`Categoria "${String(raw.categoryCode ?? raw.categoryId ?? "")}" não encontrada`);
      continue;
    }

    let budgetItem = resolveBudgetItem(budgetItems, raw, cc.id);
    if (budgetItem && budgetItem.costCenterId !== cc.id) {
      cc = costCenters.find((center) => center.id === budgetItem!.costCenterId) ?? cc;
      budgetItem = resolveBudgetItem(budgetItems, raw, cc.id);
    }
    if (!budgetItem) {
      errors.push(`Item "${String(raw.itemCode ?? raw.itemId ?? "")}" não encontrado para o centro de custo ${cc.code}`);
      continue;
    }

    const companyId = resolveCompanyId(raw, cc, version.budget.companyId);
    if (!companyId) {
      errors.push(`Empresa não definida para o centro de custo ${cc.code}`);
      continue;
    }

    const nature = await resolveNature(cat.id);

    const referenceMonth = Number(raw.month ?? 1);
    const plannedAmount = Number(raw.plannedAmount ?? 0);

    const lineScope = {
      versionId,
      costCenterId: cc.id,
      classId: cat.id,
      categoryId: cat.classId,
      natureId: nature.id,
      referenceMonth,
    };

    const existing =
      existingById ??
      (await prisma.budgetLine.findFirst({
        where: { ...lineScope, budgetItemId: budgetItem.id },
      })) ??
      (await prisma.budgetLine.findFirst({
        where: { ...lineScope, budgetItemId: null },
      })) ??
      (await prisma.budgetLine.findFirst({
        where: lineScope,
      }));

    if (existing) {
      await prisma.budgetLine.update({
        where: { id: existing.id },
        data: {
          plannedAmount,
          companyId,
          costCenterId: cc.id,
          classId: cat.id,
          categoryId: cat.classId,
          natureId: nature.id,
          referenceMonth,
          budgetItemId: budgetItem.id,
        },
      });
      savedLineIds.push(existing.id);
    } else {
      const created = await prisma.budgetLine.create({
        data: {
          versionId,
          companyId,
          costCenterId: cc.id,
          categoryId: cat.classId,
          classId: cat.id,
          natureId: nature.id,
          referenceMonth,
          plannedAmount,
          budgetItemId: budgetItem.id,
        },
      });
      savedLineIds.push(created.id);
    }
    saved += 1;
  }

  if (lines.length > 0 && saved === 0 && savedLineIds.length === 0) {
    throw new ValidationError("Nenhuma linha de planejamento foi salva", { errors });
  }

  if (errors.length > 0) {
    throw new ValidationError("Algumas linhas de planejamento não foram salvas", { errors, saved });
  }

  await prisma.budgetLine.deleteMany({
    where: {
      versionId,
      ...(savedLineIds.length ? { id: { notIn: savedLineIds } } : {}),
    },
  });

  return { ok: true as const, saved, errors };
}

export async function listActualsForFrontend(
  query: Record<string, unknown> | undefined,
  userId: string,
  roleCode: string,
) {
  const accessRestrictions = await resolveAccessRestrictions(userId, roleCode);
  const rows = await actualService.listActuals(query, accessRestrictions);
  const items = rows.map(mapActualToFrontend);
  const page = Number(query?.page ?? 1);
  const pageSize = Number(query?.pageSize ?? 50);
  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    },
  };
}

export async function getActualById(id: string) {
  const row = await prisma.actual.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Actual not found");
  return mapActualToFrontend(row);
}

export async function resolveNatureIdForFrontendCategory(categoryId: string) {
  if (!categoryId) return undefined;
  const existing = await prisma.budgetNature.findFirst({
    where: { classId: categoryId },
    orderBy: { displayOrder: "asc" },
  });
  if (existing) return existing.id;

  const created = await prisma.budgetNature.upsert({
    where: { classId_code: { classId: categoryId, code: "1" } },
    create: { classId: categoryId, code: "1", name: "Padrão", displayOrder: 1 },
    update: {},
  });
  return created.id;
}

export { resolveBudgetVersionId } from "../budgets/version-resolver";

export async function getExecutiveDashboard(rawQuery: Record<string, unknown> = {}, userId?: string, roleCode?: string) {
  const access = await resolveAccessRestrictions(userId, roleCode);
  return buildExecutiveDashboard(rawQuery, access);
}

export async function getBudgetResumo(rawQuery: Record<string, unknown>) {
  return budgetResumo(rawQuery);
}

export async function getComparativeReport(query: Record<string, unknown>, userId?: string, roleCode?: string) {
  const access = await resolveAccessRestrictions(userId, roleCode);
  return comparativeReport(query, access);
}

export async function getExecutiveAlerts(rawQuery: Record<string, unknown> = {}, userId?: string, roleCode?: string) {
  const dashboard = await getExecutiveDashboard(rawQuery, userId, roleCode);
  return dashboard.alerts;
}

export async function listForecastRevisions(rawQuery: Record<string, unknown> = {}, userId?: string, roleCode?: string) {
  const access = await resolveAccessRestrictions(userId, roleCode);
  return forecastService.listForecastRevisions(rawQuery, access);
}

export {
  createForecastRevision,
  updateForecastRevision,
  deleteForecastRevision,
};
