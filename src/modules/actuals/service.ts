import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";
import { ActualSource, Prisma, Status } from "@prisma/client";

function mapFrontendOriginToSource(origin?: string): ActualSource | undefined {
  if (!origin) return undefined;
  const map: Record<string, ActualSource> = {
    manual: "MANUAL",
    MANUAL: "MANUAL",
    import: "IMPORT",
    IMPORT: "IMPORT",
    integracao: "INTEGRATION",
    erp: "INTEGRATION",
    INTEGRATION: "INTEGRATION",
  };
  return map[origin];
}

function mapFrontendStatusToDb(status?: string): Status | undefined {
  if (!status) return undefined;
  const map: Record<string, Status> = {
    pendente: "INACTIVE",
    validado: "ACTIVE",
    conciliado: "ACTIVE",
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  };
  return map[status];
}

function parseCsv(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s !== "all");
  return items.length ? items : undefined;
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v || v === "all") return undefined;
  return v;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function startOfMonthUTC(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
}

function startOfNextMonthUTC(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12, 1, 0, 0, 0, 0));
}

function parseSearchAmount(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\s/g, "").replace(/^[Rr]\$/, "").replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return undefined;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function looksLikeAmountSearch(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return /^[\d\s.,R$r$-]+$/.test(trimmed);
}

async function findActualIdsByAmountDigits(digits: string): Promise<string[]> {
  if (!digits) return [];
  const pattern = `%${digits}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id::text AS id
      FROM actuals
      WHERE regexp_replace(amount::text, '[^0-9]', '', 'g') LIKE ${pattern}
    `,
  );
  return rows.map((row) => row.id);
}

function parseMonthListFromQuery(raw?: Record<string, unknown>): number[] | undefined {
  const fromMonthIds = parseCsv(raw?.monthIds);
  if (fromMonthIds?.length) {
    const months = fromMonthIds.map((v) => Number(v)).filter((m) => m >= 1 && m <= 12);
    if (months.length) return months;
  }
  const month = parseNumber(raw?.month);
  if (month && month >= 1 && month <= 12) return [month];
  return undefined;
}

function resolveYear(raw?: Record<string, unknown>): number | undefined {
  const fromYearIds = parseCsv(raw?.yearIds);
  if (fromYearIds?.length) {
    const y = Number(fromYearIds[0]);
    if (Number.isFinite(y) && y >= 2000) return y;
  }
  return parseNumber(raw?.year);
}

function appendWhereAnd(where: Record<string, unknown>, clause: Record<string, unknown>) {
  const current = where.AND;
  if (Array.isArray(current)) {
    where.AND = [...current, clause];
  } else if (current) {
    where.AND = [current, clause];
  } else {
    where.AND = [clause];
  }
}

export interface AccessRestrictions {
  companyIds?: string[];
  costCenterIds?: string[];
  classIds?: string[];
  categoryIds?: string[];
  budgetItemIds?: string[];
}

export async function listActuals(rawQuery?: Record<string, unknown>, access?: AccessRestrictions) {
  const companyIds = parseCsv(rawQuery?.companyIds);
  const ledgerClassIds = parseCsv(rawQuery?.classIds);
  const costCenterIds = parseCsv(rawQuery?.ccIds) ?? parseCsv(rawQuery?.costCenterIds);
  const budgetClassIds = parseCsv(rawQuery?.categoryIds);

  const source = mapFrontendOriginToSource(parseString(rawQuery?.origin));
  const status = mapFrontendStatusToDb(parseString(rawQuery?.status));
  const search = parseString(rawQuery?.search);
  const from = parseString(rawQuery?.from);
  const to = parseString(rawQuery?.to);

  const where: Record<string, unknown> = {};

  if (companyIds) {
    if (access?.companyIds) {
      const allowed = companyIds.filter((id) => access.companyIds!.includes(id));
      where.companyId = { in: allowed };
    } else {
      where.companyId = { in: companyIds };
    }
  } else if (access?.companyIds) {
    where.companyId = { in: access.companyIds };
  }

  if (ledgerClassIds) {
    if (access?.classIds) {
      const allowed = ledgerClassIds.filter((id) => access.classIds!.includes(id));
      where.categoryId = { in: allowed };
    } else {
      where.categoryId = { in: ledgerClassIds };
    }
  } else if (access?.classIds) {
    where.categoryId = { in: access.classIds };
  }

  if (budgetClassIds) {
    if (access?.categoryIds) {
      const allowed = budgetClassIds.filter((id) => access.categoryIds!.includes(id));
      where.classId = { in: allowed };
    } else {
      where.classId = { in: budgetClassIds };
    }
  } else if (access?.categoryIds) {
    where.classId = { in: access.categoryIds };
  }

  if (costCenterIds) {
    if (access?.costCenterIds) {
      const allowed = costCenterIds.filter((id) => access.costCenterIds!.includes(id));
      where.costCenterId = { in: allowed };
    } else {
      where.costCenterId = { in: costCenterIds };
    }
  } else if (access?.costCenterIds) {
    where.costCenterId = { in: access.costCenterIds };
  }

  if (access?.budgetItemIds?.length) {
    where.budgetItemId = { in: access.budgetItemIds };
  }

  if (source) where.source = source;
  if (status) where.status = status;

  if (from || to) {
    const competenceDate: { gte?: Date; lt?: Date } = {};
    if (from) competenceDate.gte = new Date(from);
    if (to) competenceDate.lt = new Date(to);
    where.competenceDate = competenceDate;
  } else {
    const year = resolveYear(rawQuery);
    const months = parseMonthListFromQuery(rawQuery);
    if (year && months?.length) {
      appendWhereAnd(where, {
        OR: months.map((month) => ({
          competenceDate: {
            gte: startOfMonthUTC(year, month),
            lt: startOfNextMonthUTC(year, month),
          },
        })),
      });
    } else if (year) {
      where.competenceDate = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      };
    }
  }

  if (search) {
    const or: Record<string, unknown>[] = [
      { description: { contains: search, mode: "insensitive" } },
      { documentNumber: { contains: search, mode: "insensitive" } },
    ];

    const parsedAmount = parseSearchAmount(search);
    if (parsedAmount !== undefined) {
      or.push({ amount: parsedAmount });
    }

    if (looksLikeAmountSearch(search)) {
      const digits = search.replace(/\D/g, "");
      if (digits.length >= 1) {
        const ids = await findActualIdsByAmountDigits(digits);
        if (ids.length > 0) {
          or.push({ id: { in: ids } });
        }
      }
    }

    where.OR = or;
  }

  return prisma.actual.findMany({
    where: Object.keys(where).length ? (where as any) : undefined,
    orderBy: { competenceDate: "desc" },
  });
}

export async function createActual(data: {
  budgetId?: string;
  companyId: string;
  launchDate: string | Date;
  competenceDate: string | Date;
  costCenterId: string;
  budgetItemId?: string;
  categoryId: string;
  classId: string;
  natureId: string;
  projectId?: string;
  supplierId?: string;
  documentNumber?: string;
  description: string;
  amount: number;
  source?: ActualSource;
  status?: Status;
  importBatchId?: string;
  actorId?: string;
}) {
  let budgetId = data.budgetId;
  if (!budgetId) {
    const competenceDate = new Date(data.competenceDate);
    const year = competenceDate.getUTCFullYear();
    const budgets = await prisma.budget.findMany({
      where: { companyId: data.companyId, year },
      select: { id: true },
    });
    if (budgets.length === 1) budgetId = budgets[0].id;
  }

  const created = await prisma.actual.create({
    data: {
      budgetId,
      companyId: data.companyId,
      launchDate: new Date(data.launchDate),
      competenceDate: new Date(data.competenceDate),
      costCenterId: data.costCenterId,
      budgetItemId: data.budgetItemId,
      categoryId: data.categoryId,
      classId: data.classId,
      natureId: data.natureId,
      projectId: data.projectId,
      supplierId: data.supplierId,
      documentNumber: data.documentNumber,
      description: data.description,
      amount: data.amount,
      source: data.source,
      status: data.status,
      importBatchId: data.importBatchId,
      createdBy: data.actorId
    }
  });
  await writeAuditLog({ module: "actuals", entity: "actual", entityId: created.id, action: "create", userId: data.actorId, afterJson: created });
  return created;
}

export async function updateActual(id: string, data: Record<string, unknown>, actorId?: string) {
  const before = await prisma.actual.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Actual not found");
  const { actorId: _ignored, ...patch } = data;
  if (typeof patch.launchDate === "string") patch.launchDate = new Date(patch.launchDate);
  if (typeof patch.competenceDate === "string") patch.competenceDate = new Date(patch.competenceDate);
  const updated = await prisma.actual.update({ where: { id }, data: patch });
  await writeAuditLog({ module: "actuals", entity: "actual", entityId: id, action: "update", userId: actorId, beforeJson: before, afterJson: updated });
  return updated;
}

export async function deleteActual(id: string, actorId?: string) {
  const before = await prisma.actual.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Actual not found");
  await prisma.actual.delete({ where: { id } });
  await writeAuditLog({ module: "actuals", entity: "actual", entityId: id, action: "delete", userId: actorId, beforeJson: before });
  return { deleted: true };
}
