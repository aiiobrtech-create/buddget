export type ExecutiveAlertDto = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  href?: string;
};

export function buildExecutiveAlerts(input: {
  variancePct: number;
  varianceValue: number;
  availableBalance: number;
  topVariances: Array<{ name: string; variance: number; health: string }>;
  executionByCostCenter: Array<{ code: string; name: string; executionPct: number }>;
}): ExecutiveAlertDto[] {
  const alerts: ExecutiveAlertDto[] = [];
  const now = new Date().toISOString();

  if (Math.abs(input.variancePct) >= 5) {
    alerts.push({
      id: "variance-global",
      title: input.variancePct > 0 ? "Realizado acima do orçamento" : "Realizado abaixo do orçamento",
      message: `Variação global de ${input.variancePct.toFixed(1)}% (R$ ${Math.abs(input.varianceValue).toLocaleString("pt-BR")}).`,
      severity: Math.abs(input.variancePct) >= 10 ? "critical" : "warning",
      createdAt: now,
      href: "/comparativo",
    });
  }

  for (const row of input.topVariances.filter((v) => v.health === "over" || v.health === "attention").slice(0, 4)) {
    alerts.push({
      id: `variance-${row.name}`,
      title: `Desvio — ${row.name}`,
      message: `Variação de R$ ${Math.abs(row.variance).toLocaleString("pt-BR")} vs orçamento.`,
      severity: row.health === "over" ? "critical" : "warning",
      createdAt: now,
      href: "/comparativo",
    });
  }

  for (const cc of input.executionByCostCenter.filter((c) => c.executionPct > 1).slice(0, 4)) {
    alerts.push({
      id: `cc-${cc.code}`,
      title: `CC ${cc.code} acima do planejado`,
      message: `${cc.name}: execução em ${(cc.executionPct * 100).toFixed(0)}% do orçado.`,
      severity: "critical",
      createdAt: now,
      href: "/comparativo",
    });
  }

  if (input.availableBalance < 0) {
    alerts.push({
      id: "balance-negative",
      title: "Saldo negativo",
      message: "Saldo disponível abaixo de zero no consolidado filtrado.",
      severity: "critical",
      createdAt: now,
      href: "/",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-ok",
      title: "Nenhum alerta crítico",
      message: "Indicadores dentro dos limites para os filtros atuais.",
      severity: "info",
      createdAt: now,
    });
  }

  return alerts;
}
