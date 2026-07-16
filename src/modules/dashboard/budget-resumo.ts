import { prisma } from "../../config/prisma";
import { percentageExecution } from "../../common/utils/math";
import { buildReportScope, parseComparativeQuery } from "./comparative-report";
import { isCapex, isReceita } from "./budget-nature";

export type ResumoLine = {
  id: string;
  code: string;
  label: string;
  planned: number;
  actual: number;
  variationPct: number;
  balance: number;
  isTotal?: boolean;
};

export type ResumoSection = {
  id: string;
  title: string;
  rows: ResumoLine[];
};

export type ResumoHighlight = {
  title: string;
  planned: number;
  actual: number;
  variationPct: number;
};

export type BudgetResumo = {
  year: number;
  sections: ResumoSection[];
  operationalSurplus: ResumoHighlight;
  netSurplus: ResumoHighlight;
};

function toLine(
  id: string,
  code: string,
  name: string,
  planned: number,
  actual: number,
  opts?: { isTotal?: boolean },
): ResumoLine {
  return {
    id,
    code,
    label: opts?.isTotal ? "Total" : `${code}. ${name}`,
    planned,
    actual,
    variationPct: percentageExecution(planned, actual),
    balance: planned - actual,
    isTotal: opts?.isTotal,
  };
}

function sumLines(rows: ResumoLine[]): ResumoLine {
  const planned = rows.reduce((s, r) => s + r.planned, 0);
  const actual = rows.reduce((s, r) => s + r.actual, 0);
  return toLine("total", "", "Total", planned, actual, { isTotal: true });
}

function highlight(title: string, planned: number, actual: number): ResumoHighlight {
  return { title, planned, actual, variationPct: percentageExecution(planned, actual) };
}

export async function budgetResumo(rawQuery: Record<string, unknown> = {}): Promise<BudgetResumo> {
  const query = parseComparativeQuery(rawQuery);
  const { year, months, classIds, lineWhere, actualWhere } = await buildReportScope(query);

  const classes = await prisma.budgetCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
  });

  const [plannedByClass, actualRows] = await Promise.all([
    prisma.budgetLine.groupBy({
      by: ["categoryId"],
      where: lineWhere,
      _sum: { plannedAmount: true },
    }),
    prisma.actual.findMany({
      where: actualWhere,
      select: { categoryId: true, amount: true, competenceDate: true },
    }),
  ]);

  const plannedMap = new Map(
    plannedByClass.map((r) => [r.categoryId, Number(r._sum.plannedAmount ?? 0)]),
  );
  const actualMap = new Map<string, number>();
  for (const row of actualRows) {
    if (months) {
      const month = row.competenceDate.getUTCMonth() + 1;
      if (!months.includes(month)) continue;
    }
    actualMap.set(row.categoryId, (actualMap.get(row.categoryId) ?? 0) + Number(row.amount.toString()));
  }

  const receitaRows: ResumoLine[] = [];
  const despesaRows: ResumoLine[] = [];
  const capexRows: ResumoLine[] = [];

  for (const cls of classes) {
    if (classIds && !classIds.includes(cls.id)) continue;
    const nature = cls.description ?? "Despesa";
    const planned = plannedMap.get(cls.id) ?? 0;
    const actual = actualMap.get(cls.id) ?? 0;
    if (planned === 0 && actual === 0) continue;

    const line = toLine(cls.id, cls.code, cls.name, planned, actual);
    if (isCapex(cls.name, nature)) {
      capexRows.push(line);
    } else if (isReceita(nature)) {
      receitaRows.push(line);
    } else {
      despesaRows.push(line);
    }
  }

  const receitaTotal = receitaRows.length ? sumLines(receitaRows) : null;
  const despesaTotal = despesaRows.length ? sumLines(despesaRows) : null;
  const capexTotal = capexRows.length ? sumLines(capexRows) : null;

  const sections: ResumoSection[] = [
    {
      id: "receitas",
      title: "Receitas",
      rows: receitaRows.length && receitaTotal ? [...receitaRows, receitaTotal] : receitaRows,
    },
    {
      id: "despesas",
      title: "Despesas",
      rows: despesaRows.length && despesaTotal ? [...despesaRows, despesaTotal] : despesaRows,
    },
    {
      id: "capex",
      title: "Capex/Imobilizado",
      rows: capexRows.length && capexTotal ? [...capexRows, capexTotal] : capexRows,
    },
  ];

  const receitaPlanned = receitaTotal?.planned ?? 0;
  const receitaActual = receitaTotal?.actual ?? 0;
  const despesaPlanned = despesaTotal?.planned ?? 0;
  const despesaActual = despesaTotal?.actual ?? 0;
  const capexPlanned = capexTotal?.planned ?? 0;
  const capexActual = capexTotal?.actual ?? 0;

  const opPlanned = receitaPlanned - despesaPlanned;
  const opActual = receitaActual - despesaActual;
  const netPlanned = opPlanned - capexPlanned;
  const netActual = opActual - capexActual;

  return {
    year,
    sections,
    operationalSurplus: highlight("Superávit/Déficit - Operacional", opPlanned, opActual),
    netSurplus: highlight("Superávit/Déficit", netPlanned, netActual),
  };
}
