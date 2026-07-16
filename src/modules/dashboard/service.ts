import { prisma } from "../../config/prisma";
import { percentageDeviation } from "../../common/utils/math";

export async function summary(companyId?: string, versionId?: string) {
  const where = {
    ...(companyId ? { companyId } : {}),
    ...(versionId ? { versionId } : {}),
  };

  const budget = await prisma.budgetLine.aggregate({
    where,
    _sum: { plannedAmount: true }
  });

  const actual = await prisma.actual.aggregate({
    where,
    _sum: { amount: true }
  });

  const forecast = await prisma.forecast.aggregate({
    _sum: { forecastAmount: true }
  });

  const budgetTotal = Number(budget._sum.plannedAmount ?? 0);
  const actualTotal = Number(actual._sum.amount ?? 0);
  const forecastTotal = Number(forecast._sum.forecastAmount ?? 0);

  return {
    budgetTotal,
    actualTotal,
    forecastTotal,
    balance: budgetTotal - actualTotal,
    deviationValue: actualTotal - budgetTotal,
    deviationPercent: percentageDeviation(budgetTotal, actualTotal)
  };
}

export async function monthly(companyId?: string, versionId?: string) {
  const where = {
    ...(companyId ? { companyId } : {}),
    ...(versionId ? { versionId } : {}),
  };

  const [plannedRows, actualRows] = await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["referenceMonth"],
      where,
      _sum: { plannedAmount: true }
    }),
    prisma.actual.findMany({ where, select: { amount: true, competenceDate: true } })
  ]);

  const monthlyActual = new Map<number, number>();
  for (const row of actualRows) {
    const month = row.competenceDate.getUTCMonth() + 1;
    monthlyActual.set(month, (monthlyActual.get(month) ?? 0) + Number(row.amount));
  }

  return plannedRows.map((row) => {
    const planned = Number(row._sum.plannedAmount ?? 0);
    const actual = monthlyActual.get(row.referenceMonth) ?? 0;

    return {
      month: row.referenceMonth,
      planned,
      actual,
      deviationValue: actual - planned,
      deviationPercent: percentageDeviation(planned, actual)
    };
  });
}

export async function byCategory(companyId?: string, versionId?: string) {
  const versionFilter = versionId ? `AND bl.version_id = '${versionId}'` : "";
  return prisma.$queryRawUnsafe(
    `
      SELECT bc.code, bc.name,
             COALESCE(SUM(bl.planned_amount),0) as planned,
             COALESCE(SUM(a.amount),0) as actual
      FROM budget_categories bc
      LEFT JOIN budget_lines bl ON bl.category_id = bc.id ${versionFilter}
      LEFT JOIN actuals a ON a.category_id = bc.id
      ${companyId ? `WHERE bl.company_id = '${companyId}' OR a.company_id = '${companyId}'` : ""}
      GROUP BY bc.code, bc.name
      ORDER BY bc.name ASC
    `
  );
}

export async function topDeviations(companyId?: string, versionId?: string) {
  const rows = await monthly(companyId, versionId);
  return rows
    .sort((a, b) => Math.abs(b.deviationValue) - Math.abs(a.deviationValue))
    .slice(0, 10);
}

export async function byCostCenter(companyId?: string, versionId?: string) {
  const versionFilter = versionId ? `AND bl.version_id = '${versionId}'` : "";
  return prisma.$queryRawUnsafe(
    `
      SELECT cc.id, cc.code, cc.name,
             COALESCE(SUM(bl.planned_amount),0) as planned,
             COALESCE(SUM(a.amount),0) as actual
      FROM cost_centers cc
      LEFT JOIN budget_lines bl ON bl.cost_center_id = cc.id ${versionFilter}
      LEFT JOIN actuals a ON a.cost_center_id = cc.id
      ${companyId ? `WHERE cc.company_id = '${companyId}'` : ""}
      GROUP BY cc.id, cc.code, cc.name
      ORDER BY cc.name ASC
    `
  );
}
