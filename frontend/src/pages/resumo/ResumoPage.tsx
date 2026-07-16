import { useEffect, useMemo, useState, useCallback } from 'react'
import { PageHeader, GlobalFilterBar, ExportSplitGroup } from '@/components/ui'
import { resumoService } from '@/services/modules/resumo.service'
import { formatBRL } from '@/lib/formatters/currency'
import { formatSaldoDisplay, saldoToneClass, type NatureSectionId } from '@/lib/formatters/saldo-display'
import { exportResumoToPdf, exportResumoToXlsx } from '@/lib/resumo-export'
import { emptyBudgetResumo } from '@/lib/resumo-empty'
import type { BudgetResumo, ResumoHighlight, ResumoLine, ResumoSection } from '@/types/resumo'
import { cn } from '@/lib/utils'
import { useGlobalFilters } from '@/context/global-filters-context'

import { formatPct } from '@/lib/formatters/percent'

const RESUMO_TABLE_CLASS = 'w-full table-fixed border-collapse text-sm'
const RESUMO_CATEGORY_COL = 'w-auto'
const RESUMO_MONEY_COL = 'w-[8.75rem]'
const RESUMO_VAR_COL = 'w-[6.75rem] whitespace-nowrap'

function MoneyCell({ value, emphasis }: { value: number; emphasis?: boolean }) {
  return (
    <span
      className={cn(
        'font-mono text-xs tabular-nums',
        emphasis ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text)]',
      )}
    >
      {formatBRL(value)}
    </span>
  )
}

function SaldoCell({
  planned,
  actual,
  balance,
  natureSection,
  emphasis,
}: {
  planned: number
  actual: number
  balance: number
  natureSection: NatureSectionId
  emphasis?: boolean
}) {
  return (
    <span
      className={cn(
        'font-mono text-xs tabular-nums',
        emphasis ? 'font-semibold' : undefined,
        saldoToneClass(balance, planned, actual, natureSection) ?? 'text-[var(--color-text)]',
      )}
    >
      {formatSaldoDisplay(balance, planned, actual, natureSection)}
    </span>
  )
}

function ResumoTable({ section }: { section: ResumoSection }) {
  return (
    <div className="glass glass-hover section-shell min-w-0 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]">{section.title}</h2>
      <div className="table-shell scrollbar-thin">
        <table className={RESUMO_TABLE_CLASS}>
          <thead className="bg-[var(--color-bg2)]/80 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text2)]">
            <tr>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-left', RESUMO_CATEGORY_COL)}>
                Categoria
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
                Orçado
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
                Realizado
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_VAR_COL)}>
                Variação %
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_MONEY_COL)}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <ResumoRow key={row.id} row={row} sectionId={section.id as NatureSectionId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResumoRow({ row, sectionId }: { row: ResumoLine; sectionId: NatureSectionId }) {
  const total = row.isTotal
  return (
    <tr
      className={cn(
        'hover:bg-white/[0.03]',
        total && 'bg-[var(--color-bg4)]/85 font-semibold',
      )}
    >
      <td
        className={cn(
          'border-b border-[var(--color-border)]/70 px-3 py-2 text-[13px] text-[var(--color-text)]',
          total ? 'uppercase tracking-wide' : 'truncate',
        )}
        title={row.label}
      >
        {row.label}
      </td>
      <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
        <MoneyCell value={row.planned} emphasis={total} />
      </td>
      <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
        <MoneyCell value={row.actual} emphasis={total} />
      </td>
      <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2 text-right', RESUMO_VAR_COL)}>
        <span className={cn('font-mono text-xs tabular-nums', total ? 'text-[var(--color-text)]' : 'text-[var(--color-text2)]')}>
          {formatPct(row.variationPct)}
        </span>
      </td>
      <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
        <SaldoCell
          planned={row.planned}
          actual={row.actual}
          balance={row.balance}
          natureSection={sectionId}
          emphasis={total}
        />
      </td>
    </tr>
  )
}

function HighlightCard({ row }: { row: ResumoHighlight }) {
  return (
    <div className="glass glass-hover section-shell min-w-0 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]">{row.title}</h2>
      <div className="table-shell scrollbar-thin">
        <table className={RESUMO_TABLE_CLASS}>
          <thead className="bg-[var(--color-bg2)]/80 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text2)]">
            <tr>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2', RESUMO_CATEGORY_COL)} aria-hidden />
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
                Orçado
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_MONEY_COL)}>
                Realizado
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2 text-right', RESUMO_VAR_COL)}>
                Variação %
              </th>
              <th className={cn('border-b border-[var(--color-border)]/80 px-3 py-2', RESUMO_MONEY_COL)} aria-hidden />
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[var(--color-bg4)]/85 font-semibold">
              <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2.5', RESUMO_CATEGORY_COL)} aria-hidden />
              <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2.5 text-right', RESUMO_MONEY_COL)}>
                <MoneyCell value={row.planned} emphasis />
              </td>
              <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2.5 text-right', RESUMO_MONEY_COL)}>
                <MoneyCell value={row.actual} emphasis />
              </td>
              <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2.5 text-right', RESUMO_VAR_COL)}>
                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--color-text)]">
                  {formatPct(row.variationPct)}
                </span>
              </td>
              <td className={cn('border-b border-[var(--color-border)]/70 px-3 py-2.5', RESUMO_MONEY_COL)} aria-hidden />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ResumoPage() {
  const {
    effectiveCompanyIds,
    classIds,
    ccIds,
    categoryIds,
    budgetIds,
    selectedVersionId,
    yearIds,
    monthIds,
    isLoadingOptions,
  } = useGlobalFilters()

  const year = useMemo(() => {
    const y = Number(yearIds.find((id) => id !== 'all') ?? yearIds[0] ?? new Date().getFullYear())
    return Number.isFinite(y) ? y : new Date().getFullYear()
  }, [yearIds])

  const [data, setData] = useState<BudgetResumo>(() => emptyBudgetResumo(year))

  const sectionById = useMemo(() => new Map(data.sections.map((s) => [s.id, s])), [data.sections])

  useEffect(() => {
    setData(emptyBudgetResumo(year))
  }, [year])

  useEffect(() => {
    if (isLoadingOptions) return

    let alive = true
    void resumoService
      .getBudgetResumo({
        year,
        yearIds,
        monthIds,
        companyIds: effectiveCompanyIds,
        classIds,
        costCenterIds: ccIds,
        categoryIds,
        budgetIds,
        versionId: selectedVersionId,
      })
      .then((d) => {
        if (alive) setData(d)
      })
    return () => {
      alive = false
    }
  }, [
    year,
    yearIds,
    monthIds,
    effectiveCompanyIds,
    classIds,
    ccIds,
    categoryIds,
    budgetIds,
    selectedVersionId,
    isLoadingOptions,
  ])

  const exportXlsx = useCallback(() => {
    exportResumoToXlsx(data)
  }, [data])

  const exportPdf = useCallback(() => {
    exportResumoToPdf(data)
  }, [data])

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Resumo Orçamento"
        actions={<ExportSplitGroup onExcel={exportXlsx} onPdf={exportPdf} />}
      />

      <GlobalFilterBar />

      <div className="space-y-6">
        {sectionById.get('receitas') ? <ResumoTable section={sectionById.get('receitas')!} /> : null}
        {sectionById.get('despesas') ? <ResumoTable section={sectionById.get('despesas')!} /> : null}
        <HighlightCard row={data.operationalSurplus} />
        {sectionById.get('capex') ? <ResumoTable section={sectionById.get('capex')!} /> : null}
        <HighlightCard row={data.netSurplus} />
      </div>
    </div>
  )
}
