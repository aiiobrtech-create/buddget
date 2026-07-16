export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface ExecutiveAlert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  createdAt: string
  href?: string
}

export interface ExecutiveKpis {
  budgetTotal: number
  actualTotal: number
  varianceValue: number
  variancePct: number
  availableBalance: number
  committed: number
  forecastTotal: number
}

export interface ExecutiveCharts {
  budgetVsActualByMonth: { key: string; label: string; orcado: number; realizado: number }[]
  categorySplit: { name: string; value: number }[]
  topVariances: { name: string; variance: number; health: 'ok' | 'attention' | 'over' }[]
  executionByCostCenter: { code: string; name: string; executionPct: number }[]
  forecastTrend: { month: string; original: number; revisao: number; forecast: number }[]
  annualConsolidated: { month: string; orcadoAcum: number; realizadoAcum: number }[]
}

export interface ExecutiveDashboard {
  kpis: ExecutiveKpis
  alerts: ExecutiveAlert[]
  charts: ExecutiveCharts
}
