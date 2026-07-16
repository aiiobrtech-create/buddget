import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react'
import { PageHeader, KpiCard, ChartCard, Skeleton, GlobalFilterBar } from '@/components/ui'
import {
  AnnualAreaChart,
  BudgetVsActualChart,
  CategorySplitChart,
  CostCenterExecutionChart,
  MonthlyExecutionChart,
  TopVarianceChart,
} from '@/components/charts'
import { dashboardService } from '@/services/modules/dashboard.service'
import { formatBRL } from '@/lib/formatters/currency'
import type { ExecutiveDashboard } from '@/types/dashboard'
import { getErrorMessage } from '@/services/api/errors'
import { cn } from '@/lib/utils'
import { useGlobalFilters } from '@/context/global-filters-context'
import { useToast } from '@/context/toast-context'

function Trend({ value, invertGood }: { value: number; invertGood?: boolean }) {
  const good = invertGood ? value > 0 : value < 0
  const Icon = good ? ArrowDownRight : ArrowUpRight
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold',
        good ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-100',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value.toFixed(2)}%
    </div>
  )
}

function printDashboardVisual() {
  document.body.classList.add('printing-dashboard')
  const cleanup = () => document.body.classList.remove('printing-dashboard')
  window.addEventListener('afterprint', cleanup, { once: true })
  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('beforeprint'))
  window.setTimeout(() => window.print(), 200)
}

export function DashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<ExecutiveDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { effectiveCompanyIds, classIds, ccIds, categoryIds, budgetIds, selectedVersionId, yearIds, monthIds, isLoadingOptions } = useGlobalFilters()

  useEffect(() => {
    if (isLoadingOptions) return

    let alive = true
    setData(null)
    setError(null)
    void dashboardService
      .getExecutive({
        year: Number(yearIds.find((id) => id !== 'all') ?? yearIds[0] ?? new Date().getFullYear()),
        yearIds,
        monthIds,
        companyIds: effectiveCompanyIds,
        classIds,
        ccIds,
        categoryIds,
        budgetIds,
        versionId: selectedVersionId,
      })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(getErrorMessage(e)))
    return () => {
      alive = false
    }
  }, [effectiveCompanyIds, classIds, ccIds, categoryIds, budgetIds, selectedVersionId, yearIds, monthIds, isLoadingOptions])

  const exportPdf = () => {
    if (!data) {
      toast.push({ variant: 'info', title: 'Aguarde', message: 'Os dados do dashboard ainda estão carregando.' })
      return
    }
    printDashboardVisual()
  }

  return (
    <div className="min-w-0 space-y-8">
      <div className="dashboard-no-print">
        <PageHeader
          title="Dashboard"
          actions={
            <button type="button" className="btn-toolbar-secondary" onClick={exportPdf} disabled={!data}>
              <FileText className="h-3.5 w-3.5" />
              Imprimir PDF
            </button>
          }
        />

        {error ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </div>

      <div id="dashboard-print-area" className="min-w-0 space-y-8">
        <div className="hidden print:block">
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text2)]">
            Exportado em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="min-w-0">
          {!data ? (
            <Skeleton className="min-h-[120px] w-full dashboard-no-print" />
          ) : (
            <div className="glass glass-hover section-shell min-w-0 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">
                <AlertTriangle className="h-4 w-4 text-[var(--color-accent)]" />
                Alertas relevantes
              </div>
              <div className="mt-3 space-y-2">
                {data.alerts.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/35 p-3"
                  >
                    <div className="text-xs font-semibold text-[var(--color-text)]">{a.title}</div>
                    <div className="mt-1 text-[11px] text-[var(--color-text2)]">{a.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-no-print">
          <GlobalFilterBar />
        </div>

        <div className="dashboard-kpi-grid grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-3">
          {!data ? (
            <>
              <Skeleton className="h-[148px] dashboard-no-print" />
              <Skeleton className="h-[148px] dashboard-no-print" />
              <Skeleton className="h-[148px] dashboard-no-print" />
              <Skeleton className="h-[148px] dashboard-no-print" />
            </>
          ) : (
            <>
              <KpiCard label="Orçamento total" value={formatBRL(data.kpis.budgetTotal)} hint="Baseline publicada" />
              <KpiCard label="Realizado total" value={formatBRL(data.kpis.actualTotal)} hint="Acumulado YTD" />
              <KpiCard label="Saldo disponível" value={formatBRL(data.kpis.availableBalance)} hint="Após compromissos" />
              <KpiCard
                label="Desvio"
                value={formatBRL(data.kpis.varianceValue)}
                hint="Valor absoluto"
                trend={<Trend value={data.kpis.variancePct} invertGood />}
              />
            </>
          )}
        </div>

        <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-4">
          <ChartCard title="Orçado × realizado (mensal)" subtitle="Comparativo direto por competência">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <BudgetVsActualChart data={data.charts.budgetVsActualByMonth} />
            )}
          </ChartCard>
          <ChartCard title="Distribuição por categoria">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <CategorySplitChart data={data.charts.categorySplit} />
            )}
          </ChartCard>
          <ChartCard title="Top desvios" subtitle="Maiores variações absolutas (valor)">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <TopVarianceChart data={data.charts.topVariances} />
            )}
          </ChartCard>
          <ChartCard title="Execução por centro de custo" subtitle="Percentual de consumo vs orçamento">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <CostCenterExecutionChart data={data.charts.executionByCostCenter} />
            )}
          </ChartCard>
          <ChartCard title="Execução mensal (%)" subtitle="Realizado ÷ orçado por competência">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <MonthlyExecutionChart data={data.charts.budgetVsActualByMonth} />
            )}
          </ChartCard>
          <ChartCard title="Visão consolidada anual" subtitle="Curvas acumuladas executivas">
            {!data ? (
              <Skeleton className="h-full min-h-[160px] w-full dashboard-no-print" />
            ) : (
              <AnnualAreaChart data={data.charts.annualConsolidated} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
