import { prisma } from "../../config/prisma";
import { percentageDeviation } from "../../common/utils/math";
import { buildExecutiveAlerts } from "./executive-alerts";
import { buildReportScope, parseComparativeQuery, type AccessRestrictions } from "./comparative-report";
import type { ReportScope } from "./comparative-report";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function sumActualAmount(
  rows: Array<{ amount: { toString(): string }; competenceDate: Date }>,
  months?: number[],
): number {
  let total = 0;
  for (const row of rows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    if (months && !months.includes(month)) continue;
    total += Number(row.amount.toString());
  }
  return total;
}

function actualByMonth(
  rows: Array<{ amount: { toString(): string }; competenceDate: Date }>,
  months?: number[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    if (months && !months.includes(month)) continue;
    map.set(month, (map.get(month) ?? 0) + Number(row.amount.toString()));
  }
  return map;
}

async function summaryFromScope(scope: ReportScope) {
  const versionId = scope.lineWhere.versionId as string | undefined;
  const forecastWhere: Record<string, unknown> = {};
  if (versionId) forecastWhere.versionId = versionId;
  if (scope.months) forecastWhere.referenceMonth = { in: scope.months };

  const [budget, actualRows, forecast] = await Promise.all([
    prisma.budgetLine.aggregate({
      where: scope.lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: scope.actualWhere,
      select: { amount: true, competenceDate: true },
    }),
    prisma.forecast.aggregate({
      where: Object.keys(forecastWhere).length ? forecastWhere : undefined,
      _sum: { forecastAmount: true },
    }),
  ]);

  const budgetTotal = Number(budget._sum.plannedAmount ?? 0);
  const actualTotal = sumActualAmount(actualRows, scope.months);
  const forecastTotal = Number(forecast._sum.forecastAmount ?? 0);

  return {
    budgetTotal,
    actualTotal,
    forecastTotal,
    balance: budgetTotal - actualTotal,
    deviationValue: actualTotal - budgetTotal,
    deviationPercent: percentageDeviation(budgetTotal, actualTotal),
  };
}

async function monthlyFromScope(scope: ReportScope) {
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
  const actualMap = actualByMonth(actualRows, scope.months);
  const monthList = scope.months ?? Array.from({ length: 12 }, (_, index) => index + 1);

  return monthList
    .sort((a, b) => a - b)
    .map((month) => {
      const planned = plannedByMonth.get(month) ?? 0;
      const actual = actualMap.get(month) ?? 0;
      return {
        month,
        planned,
        actual,
        deviationValue: actual - planned,
        deviationPercent: percentageDeviation(planned, actual),
      };
    });
}

async function byCategoryFromScope(scope: ReportScope) {
  const [plannedRows, actualRows, categories] = await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["classId"],
      where: scope.lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: scope.actualWhere,
      select: { classId: true, amount: true, competenceDate: true },
    }),
    prisma.budgetClass.findMany({ orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
  ]);

  const plannedMap = new Map(plannedRows.map((row) => [row.classId, Number(row._sum.plannedAmount ?? 0)]));
  const actualMap = new Map<string, number>();
  for (const row of actualRows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    if (scope.months && !scope.months.includes(month)) continue;
    actualMap.set(row.classId, (actualMap.get(row.classId) ?? 0) + Number(row.amount.toString()));
  }

  return categories
    .map((cat) => ({
      code: cat.code,
      name: cat.name,
      planned: plannedMap.get(cat.id) ?? 0,
      actual: actualMap.get(cat.id) ?? 0,
    }))
    .filter((row) => row.planned !== 0 || row.actual !== 0);
}

async function byCostCenterFromScope(scope: ReportScope) {
  const [plannedRows, actualRows, costCenters] = await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["costCenterId"],
      where: scope.lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: scope.actualWhere,
      select: { costCenterId: true, amount: true, competenceDate: true },
    }),
    prisma.costCenter.findMany({ orderBy: [{ code: "asc" }] }),
  ]);

  const plannedMap = new Map(
    plannedRows.map((row) => [row.costCenterId, Number(row._sum.plannedAmount ?? 0)]),
  );
  const actualMap = new Map<string, number>();
  for (const row of actualRows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    if (scope.months && !scope.months.includes(month)) continue;
    actualMap.set(row.costCenterId, (actualMap.get(row.costCenterId) ?? 0) + Number(row.amount.toString()));
  }

  return costCenters
    .map((cc) => ({
      id: cc.id,
      code: cc.code,
      name: cc.name,
      planned: plannedMap.get(cc.id) ?? 0,
      actual: actualMap.get(cc.id) ?? 0,
    }))
    .filter((row) => row.planned !== 0 || row.actual !== 0);
}

export async function buildExecutiveDashboard(rawQuery: Record<string, unknown> = {}, access?: AccessRestrictions) {
  const query = parseComparativeQuery(rawQuery);
  const scope = await buildReportScope(query, access);

  const summary = await summaryFromScope(scope);
  const monthly = await monthlyFromScope(scope);
  const byCategory = await byCategoryFromScope(scope);
  const byCostCenter = await byCostCenterFromScope(scope);

  const budgetTotal = Number(summary.budgetTotal ?? 0);
  const actualTotal = Number(summary.actualTotal ?? 0);
  const varianceValue = Number(summary.deviationValue ?? 0);
  const forecastTotal = Number(summary.forecastTotal ?? 0);

  const budgetVsActualByMonth = monthly.map((row) => {
    const monthNum = Number(row.month ?? 1);
    const key = String(monthNum).padStart(2, "0");
    return {
      key,
      label: MONTH_LABELS[monthNum - 1] ?? key,
      orcado: Number(row.planned ?? 0),
      realizado: Number(row.actual ?? 0),
    };
  });

  let orcadoAcum = 0;
  let realizadoAcum = 0;
  const annualConsolidated = budgetVsActualByMonth.map((row) => {
    orcadoAcum += row.orcado;
    realizadoAcum += row.realizado;
    return { month: row.label, orcadoAcum, realizadoAcum };
  });

  const categorySplit = byCategory.map((row) => ({
    name: row.name || row.code,
    value: row.actual || row.planned,
  }));

  const topVariances = [...monthly]
    .sort((a, b) => Math.abs(b.deviationValue) - Math.abs(a.deviationValue))
    .slice(0, 10)
    .map((row) => {
      const monthNum = Number(row.month ?? 1);
      const variance = Number(row.deviationValue ?? 0);
      const planned = Number(row.planned ?? 1);
      const ratio = planned > 0 ? Math.abs(variance) / planned : 0;
      const health = ratio > 0.15 ? "over" : ratio > 0.08 ? "attention" : "ok";
      return {
        name: MONTH_LABELS[monthNum - 1] ?? String(monthNum),
        variance,
        health,
      };
    });

  const executionByCostCenter = byCostCenter.map((cc) => {
    const planned = Number(cc.planned ?? 0);
    const actual = Number(cc.actual ?? 0);
    return {
      code: String(cc.code ?? ""),
      name: String(cc.name ?? ""),
      executionPct: planned > 0 ? actual / planned : 0,
    };
  });

  const forecastTrend = budgetVsActualByMonth.slice(0, 6).map((row) => ({
    month: row.label,
    original: row.orcado,
    revisao: row.orcado,
    forecast: row.realizado,
  }));

  return {
    kpis: {
      budgetTotal,
      actualTotal,
      varianceValue,
      variancePct: Number(summary.deviationPercent ?? 0),
      availableBalance: Number(summary.balance ?? 0),
      committed: 0,
      forecastTotal,
    },
    alerts: buildExecutiveAlerts({
      variancePct: Number(summary.deviationPercent ?? 0),
      varianceValue,
      availableBalance: Number(summary.balance ?? 0),
      topVariances,
      executionByCostCenter,
    }),
    charts: {
      budgetVsActualByMonth,
      categorySplit,
      topVariances,
      executionByCostCenter,
      forecastTrend,
      annualConsolidated,
    },
  };
}
