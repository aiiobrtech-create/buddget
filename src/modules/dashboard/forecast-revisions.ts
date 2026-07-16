import { prisma } from "../../config/prisma";
import { NotFoundError, ValidationError } from "../../common/errors/app-error";
import { writeAuditLog } from "../audit-logs/service";
import { createBudgetVersion } from "../budgets/service";
import { buildReportScope, parseComparativeQuery, type AccessRestrictions } from "./comparative-report";
import { computeYearEndForecast, type MonthlyBudgetActual } from "./year-end-projection";

type ForecastRevisionResponse = {
  id: string;
  label: string;
  baseVersionId: string;
  createdAt: string;
  createdBy: string;
  totals: { original: number; revised: number; forecast: number };
  projection: {
    actualYtd: number;
    budgetYtd: number;
    budgetAnnual: number;
    monthsClosed: number;
    runRateRatio: number;
    projectedRemaining: number;
    methodology: string;
  };
};

function parseIdList(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const ids = raw.map(String).filter((v) => v && v !== "all");
    return ids.length ? ids : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const ids = raw.split(",").map((s) => s.trim()).filter((v) => v && v !== "all");
    return ids.length ? ids : undefined;
  }
  return undefined;
}

function resolveYear(raw: Record<string, unknown>): number | undefined {
  const yearIds = parseIdList(raw.yearIds);
  const fromIds = yearIds?.map((v) => Number(v)).find((y) => Number.isFinite(y) && y >= 2000);
  if (fromIds) return fromIds;
  const year = Number(raw.year);
  return Number.isFinite(year) && year >= 2000 ? year : undefined;
}

async function fetchMonthlySeries(
  baseVersionId: string,
  rawQuery: Record<string, unknown>,
): Promise<MonthlyBudgetActual[]> {
  const query = parseComparativeQuery({ ...rawQuery, versionId: baseVersionId });
  const scope = await buildReportScope(query);

  const [plannedRows, actualRows] = await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["referenceMonth"],
      where: scope.lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: scope.actualWhere,
      select: { amount: true, competenceDate: true },
    }),
  ]);

  const plannedByMonth = new Map(
    plannedRows.map((row) => [row.referenceMonth, Number(row._sum.plannedAmount ?? 0)]),
  );
  const actualByMonth = new Map<number, number>();
  for (const row of actualRows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    if (scope.months && !scope.months.includes(month)) continue;
    actualByMonth.set(month, (actualByMonth.get(month) ?? 0) + Number(row.amount.toString()));
  }

  const monthList = scope.months ?? Array.from({ length: 12 }, (_, index) => index + 1);
  return monthList
    .sort((a, b) => a - b)
    .map((month) => ({
      month,
      budget: plannedByMonth.get(month) ?? 0,
      actual: actualByMonth.has(month) ? (actualByMonth.get(month) ?? 0) : null,
    }));
}

async function mapVersionToRevision(
  version: {
    id: string;
    name: string;
    baseVersionId: string | null;
    createdAt: Date;
    createdBy: string;
    budget: { year: number };
    forecasts: Array<{
      forecastAmount: { toString(): string };
      methodology: string;
      calculationMemory: unknown;
      referenceMonth: number;
    }>;
  },
  creatorName: string,
): Promise<ForecastRevisionResponse> {
  const baseVersionId = version.baseVersionId ?? version.id;
  const monthly = await fetchMonthlySeries(baseVersionId, { yearIds: String(version.budget.year) });
  const projection = computeYearEndForecast(monthly);

  const forecastRow =
    version.forecasts.find((row) => row.referenceMonth === 12) ?? version.forecasts[0] ?? null;
  const memory =
    forecastRow?.calculationMemory && typeof forecastRow.calculationMemory === "object"
      ? (forecastRow.calculationMemory as Record<string, unknown>)
      : {};
  const manualForecast =
    typeof memory.manualForecast === "number" && Number.isFinite(memory.manualForecast)
      ? memory.manualForecast
      : undefined;
  const forecastAmount = manualForecast ?? Number(forecastRow?.forecastAmount.toString() ?? projection.forecastYearEnd);

  return {
    id: version.id,
    label: version.name,
    baseVersionId,
    createdAt: version.createdAt.toISOString(),
    createdBy: creatorName,
    projection: {
      actualYtd: projection.actualYtd,
      budgetYtd: projection.budgetYtd,
      budgetAnnual: projection.budgetAnnual,
      monthsClosed: projection.monthsClosed,
      runRateRatio: projection.runRateRatio,
      projectedRemaining: projection.projectedRemaining,
      methodology: forecastRow?.methodology ?? projection.methodology,
    },
    totals: {
      original: projection.budgetAnnual,
      revised: projection.budgetAnnual,
      forecast: forecastAmount,
    },
  };
}

export async function listForecastRevisions(rawQuery: Record<string, unknown> = {}, access?: AccessRestrictions) {
  const year = resolveYear(rawQuery);
  const companyIds = parseIdList(rawQuery.companyIds);

  let allowedCompanyIds: string[] | undefined = undefined;
  if (companyIds) {
    if (access?.companyIds) {
      allowedCompanyIds = companyIds.filter((id) => access.companyIds!.includes(id));
    } else {
      allowedCompanyIds = companyIds;
    }
  } else if (access?.companyIds) {
    allowedCompanyIds = access.companyIds;
  }

  const versions = await prisma.budgetVersion.findMany({
    where: {
      type: "FORECAST",
      ...(year || allowedCompanyIds
        ? {
            budget: {
              ...(year ? { year } : {}),
              ...(allowedCompanyIds ? { companyId: { in: allowedCompanyIds } } : {}),
            },
          }
        : {}),
    },
    include: {
      budget: true,
      forecasts: { orderBy: { referenceMonth: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const creatorIds = [...new Set(versions.map((v) => v.createdBy))];
  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const creatorById = new Map(creators.map((u) => [u.id, u.name || u.email]));

  const items = await Promise.all(
    versions.map((version) =>
      mapVersionToRevision(version, creatorById.get(version.createdBy) ?? "Usuário"),
    ),
  );

  return { items };
}

export async function createForecastRevision(data: {
  label: string;
  baseVersionId: string;
  actorId: string;
}) {
  const label = data.label.trim();
  const baseVersionId = data.baseVersionId.trim();
  if (!label) throw new ValidationError("Nome do cenário é obrigatório.");
  if (!baseVersionId) throw new ValidationError("Versão orçamentária base é obrigatória.");

  const base = await prisma.budgetVersion.findUnique({
    where: { id: baseVersionId },
    include: { budget: true },
  });
  if (!base) throw new NotFoundError("Versão base não encontrada.");

  const version = await createBudgetVersion(base.budgetId, {
    name: label,
    type: "FORECAST",
    baseVersionId,
    actorId: data.actorId,
  });

  const monthly = await fetchMonthlySeries(baseVersionId, { yearIds: String(base.budget.year) });
  const projection = computeYearEndForecast(monthly);

  await prisma.forecast.create({
    data: {
      budgetId: base.budgetId,
      versionId: version.id,
      referenceMonth: 12,
      forecastAmount: projection.forecastYearEnd,
      methodology: projection.methodology,
      calculationMemory: {
        kind: "revision",
        projection,
        manualForecast: null,
      },
    },
  });

  return { id: version.id };
}

export async function updateForecastRevision(
  id: string,
  data: { label?: string; baseVersionId?: string; forecastAmount?: number },
  actorId: string,
) {
  const version = await prisma.budgetVersion.findUnique({
    where: { id },
    include: { forecasts: true },
  });
  if (!version || version.type !== "FORECAST") throw new NotFoundError("Previsão não encontrada.");

  if (data.label?.trim()) {
    await prisma.budgetVersion.update({
      where: { id },
      data: { name: data.label.trim() },
    });
  }

  if (data.baseVersionId?.trim()) {
    const base = await prisma.budgetVersion.findUnique({ where: { id: data.baseVersionId.trim() } });
    if (!base) throw new NotFoundError("Versão base não encontrada.");
    await prisma.budgetVersion.update({
      where: { id },
      data: { baseVersionId: data.baseVersionId.trim() },
    });
  }

  if (data.forecastAmount !== undefined) {
    const forecast =
      version.forecasts.find((row) => row.referenceMonth === 12) ?? version.forecasts[0] ?? null;
    if (!forecast) throw new NotFoundError("Registro de forecast não encontrado.");

    const memory =
      forecast.calculationMemory && typeof forecast.calculationMemory === "object"
        ? (forecast.calculationMemory as Record<string, unknown>)
        : {};

    await prisma.forecast.update({
      where: { id: forecast.id },
      data: {
        forecastAmount: data.forecastAmount,
        calculationMemory: {
          ...memory,
          manualForecast: data.forecastAmount,
        },
      },
    });
  }

  await writeAuditLog({
    module: "forecasts",
    entity: "forecast_revision",
    entityId: id,
    action: "update",
    userId: actorId,
  });

  return { ok: true };
}

export async function deleteForecastRevision(id: string, actorId: string) {
  const version = await prisma.budgetVersion.findUnique({ where: { id } });
  if (!version || version.type !== "FORECAST") throw new NotFoundError("Previsão não encontrada.");

  await prisma.forecast.deleteMany({ where: { versionId: id } });
  await prisma.budgetVersion.delete({ where: { id } });

  await writeAuditLog({
    module: "forecasts",
    entity: "forecast_revision",
    entityId: id,
    action: "delete",
    userId: actorId,
    beforeJson: version,
  });

  return { ok: true };
}
