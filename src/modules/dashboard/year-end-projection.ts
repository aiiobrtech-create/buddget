export const FORECAST_CONCEPT =
  "Visão realista e dinâmica do futuro: considera o realizado, a sazonalidade do orçamento e desvios de ritmo para estimar o fechamento do ano.";

export type MonthlyBudgetActual = {
  month: number;
  budget: number;
  actual: number | null;
};

export type YearEndProjection = {
  actualYtd: number;
  budgetYtd: number;
  budgetAnnual: number;
  monthsClosed: number;
  runRateRatio: number;
  budgetRemaining: number;
  projectedRemaining: number;
  forecastYearEnd: number;
  methodology: string;
};

export function computeYearEndForecast(
  months: MonthlyBudgetActual[],
  budgetAnnualOverride?: number,
): YearEndProjection {
  const sorted = [...months].sort((a, b) => a.month - b.month);
  const closed = sorted.filter((m) => m.actual != null && Number.isFinite(m.actual));
  const monthsClosed = closed.length;
  const actualYtd = closed.reduce((sum, m) => sum + (m.actual ?? 0), 0);
  const budgetYtd = closed.reduce((sum, m) => sum + m.budget, 0);
  const budgetFromSeries = sorted.reduce((sum, m) => sum + m.budget, 0);
  const budgetAnnual = budgetAnnualOverride ?? budgetFromSeries;
  const budgetRemaining = Math.max(0, budgetAnnual - budgetYtd);
  const runRateRatio = budgetYtd > 0 ? actualYtd / budgetYtd : 1;
  const projectedRemaining = budgetRemaining * runRateRatio;
  const forecastYearEnd = actualYtd + projectedRemaining;

  const methodology =
    monthsClosed === 0
      ? "Sem realizado no período — previsão igual ao orçamento anual."
      : `Realizado de ${monthsClosed} mês(es) + ${12 - monthsClosed} mês(es) restantes no perfil sazonal do orçamento, ajustados pelo ritmo real (${(runRateRatio * 100).toFixed(1)}% do orçado até agora).`;

  return {
    actualYtd,
    budgetYtd,
    budgetAnnual,
    monthsClosed,
    runRateRatio,
    budgetRemaining,
    projectedRemaining,
    forecastYearEnd,
    methodology,
  };
}
