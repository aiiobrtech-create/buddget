import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader, ExportSplitGroup, GlobalFilterBar } from '@/components/ui'
import { comparativeService } from '@/services/modules/comparative.service'
import type { ComparisonRow } from '@/types/entities'
import { formatBRL } from '@/lib/formatters/currency'
import {
  formatSaldoDisplay,
  isReceitasSaldoFavoravel,
  saldoToneClass,
} from '@/lib/formatters/saldo-display'
import { formatPct, executionPct } from '@/lib/formatters/percent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'
import { printTableExport, type PrintExportCellTone, type PrintStatusBadgeTone } from '@/lib/print-export'
import { buildFormattedSheet, downloadWorkbook } from '@/lib/excel-export'
import type { ExcelCellAccent } from '@/lib/excel-styles'
import {
  comparativeRowVariant,
  flattenFullComparativeTree,
  formatComparativeStructureLabel,
  resolveNatureSectionFromRowId,
  type ComparativeFlatRow,
  type ComparativeNatureSection,
} from '@/lib/comparative-export'
import { useGlobalFilters } from '@/context/global-filters-context'

function flattenVisible(
  rows: ComparisonRow[],
  expanded: Set<string>,
  depth = 0,
  natureSection?: ComparativeNatureSection,
): (ComparisonRow & { depth: number; natureSection?: ComparativeNatureSection })[] {
  const out: (ComparisonRow & { depth: number; natureSection?: ComparativeNatureSection })[] = []
  for (const r of rows) {
    const currentSection = resolveNatureSectionFromRowId(r.id) ?? natureSection
    out.push({ ...r, depth, natureSection: currentSection })
    const kids = r.children ?? []
    if (kids.length && expanded.has(r.id)) {
      out.push(...flattenVisible(kids, expanded, depth + 1, currentSection))
    }
  }
  return out
}



function healthPdfLabel(h: ComparisonRow['health']): string {
  switch (h) {
    case 'ok':
      return 'Dentro do orçamento'
    case 'attention':
      return 'Atenção'
    case 'over':
      return 'Acima do orçamento'
    default:
      return h
  }
}

function healthExportBadgeTone(
  h: ComparisonRow['health'],
  natureSection?: ComparativeNatureSection,
): PrintStatusBadgeTone {
  if (h === 'over' && natureSection === 'receitas') return 'revenue-over'
  if (h === 'ok') return 'ok'
  if (h === 'attention') return 'attention'
  return 'over'
}

function collectExpandableIds(rows: ComparisonRow[]): string[] {
  const ids: string[] = []
  for (const row of rows) {
    if (row.children?.length) {
      ids.push(row.id)
      ids.push(...collectExpandableIds(row.children))
    }
  }
  return ids
}

function formatStructureLabel(row: ComparisonRow): string {
  return formatComparativeStructureLabel(row)
}

function saldoExportTone(
  row: ComparisonRow,
  natureSection?: ComparativeNatureSection,
): PrintExportCellTone | undefined {
  const toneClass = saldoToneClass(row.balance, row.budgeted, row.actual, natureSection)
  if (toneClass === 'text-emerald-400') return 'saldo-green'
  if (toneClass === 'text-rose-400') return 'saldo-red'
  return undefined
}

function saldoExportValue(row: ComparisonRow, natureSection?: ComparativeNatureSection): number {
  return isReceitasSaldoFavoravel(row.budgeted, row.actual, natureSection)
    ? Math.abs(row.balance)
    : row.balance
}

function buildPdfExportRow(r: ComparativeFlatRow) {
  const saldoTone = saldoExportTone(r, r.natureSection)
  return {
    variant: comparativeRowVariant(r),
    depth: r.depth,
    cells: [
      formatStructureLabel(r),
      formatBRL(r.budgeted),
      formatBRL(r.actual),
      `${formatPct(executionPct(r.budgeted, r.actual))}%`,
      formatSaldoDisplay(r.balance, r.budgeted, r.actual, r.natureSection),
      healthPdfLabel(r.health),
    ],
    cellTones: [undefined, undefined, undefined, undefined, saldoTone, undefined] as (
      | PrintExportCellTone
      | undefined
    )[],
    statusBadge: {
      label: healthPdfLabel(r.health),
      tone: healthExportBadgeTone(r.health, r.natureSection),
    },
  }
}

function excelSaldoAccent(row: ComparativeFlatRow): ExcelCellAccent | undefined {
  const toneClass = saldoToneClass(row.balance, row.budgeted, row.actual, row.natureSection)
  if (toneClass === 'text-emerald-400') return 'saldo-green'
  if (toneClass === 'text-rose-400') return 'saldo-red'
  return undefined
}

function excelStatusAccent(row: ComparativeFlatRow): ExcelCellAccent {
  const tone = healthExportBadgeTone(row.health, row.natureSection)
  if (tone === 'revenue-over') return 'status-revenue-over'
  if (tone === 'attention') return 'status-attention'
  if (tone === 'over') return 'status-over'
  return 'status-ok'
}

function buildExcelExportRowMeta(row: ComparativeFlatRow) {
  return {
    outlineLevel: row.depth,
    variant: comparativeRowVariant(row),
    indent: row.depth,
    cellAccents: [
      undefined,
      undefined,
      undefined,
      undefined,
      excelSaldoAccent(row),
      excelStatusAccent(row),
    ] as (ExcelCellAccent | undefined)[],
  }
}

export function ComparativePage() {
  const { yearIds, monthIds, effectiveCompanyIds, classIds, ccIds, categoryIds, budgetIds, selectedVersionId, isLoadingOptions } = useGlobalFilters()

  const [tree, setTree] = useState<ComparisonRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']))

  useEffect(() => {
    if (isLoadingOptions) return

    void comparativeService
      .getTree({
        yearIds,
        monthIds,
        companyIds: effectiveCompanyIds,
        classIds,
        budgetIds,
        versionId: selectedVersionId,
        costCenterIds: ccIds,
        categoryIds,
        year: parseInt(yearIds[0] ?? '2026'),
      })
      .then((r) => {
        setTree(r.rows)
        setExpanded(new Set(collectExpandableIds(r.rows)))
      })
  }, [yearIds, monthIds, effectiveCompanyIds, classIds, budgetIds, selectedVersionId, ccIds, categoryIds, isLoadingOptions])

  const flat = useMemo(() => flattenVisible(tree, expanded), [tree, expanded])
  const flatExport = useMemo(() => flattenFullComparativeTree(tree), [tree])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const exportXlsx = () => {
    const exportedAt = new Date().toLocaleString('pt-BR')
    const sheet = buildFormattedSheet({
      sheetName: 'Comparativo',
      title: 'Comparativo: Orçado x Realizado',
      subtitles: ['BUDDGET · Gestão orçamentária', `Exportado em ${exportedAt}`],
      headers: ['Estrutura', 'Orçado', 'Realizado', 'Variação %', 'Saldo', 'Status'],
      headerAligns: ['left', 'right', 'right', 'right', 'right', 'center'],
      rows: flatExport.map((r) => [
        formatStructureLabel(r),
        r.budgeted,
        r.actual,
        executionPct(r.budgeted, r.actual),
        saldoExportValue(r, r.natureSection),
        healthPdfLabel(r.health),
      ]),
      rowMeta: flatExport.map((r) => buildExcelExportRowMeta(r)),
      outlineSummaryAbove: true,
      collapsedOutlineLevel: 1,
      columnWidths: [52, 16, 16, 12, 16, 22],
      currencyColumnIndexes: [1, 2, 4],
      percentColumnIndexes: [3],
    })
    const stamp = new Date().toISOString().slice(0, 10)
    downloadWorkbook(sheet, 'Comparativo', `buddget-comparativo-${stamp}.xlsx`)
  }

  const exportPdf = () => {
    printTableExport({
      documentTitle: 'BUDDGET · Comparativo',
      heading: 'Comparativo: Orçado x Realizado',
      subtitleLines: [
        'Hierarquia completa com subtotais',
        'Filtros aplicados na tela',
        `Exportado em ${new Date().toLocaleString('pt-BR')}`,
      ],
      columns: [
        { header: 'Estrutura', align: 'left' },
        { header: 'Orçado', align: 'right' },
        { header: 'Realizado', align: 'right' },
        { header: 'Variação %', align: 'right' },
        { header: 'Saldo', align: 'right' },
        { header: 'Status', align: 'center' },
      ],
      rows: flatExport.map((r) => buildPdfExportRow(r)),
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="shrink-0 space-y-6">
        <PageHeader
          title="Comparativo: Orçado x Realizado"
          actions={<ExportSplitGroup onExcel={exportXlsx} onPdf={exportPdf} />}
        />

        <GlobalFilterBar />
      </div>

      <div className="table-shell table-shell-scroll scrollbar-thin">
        <table className="table-data" style={{ minWidth: 'max(100%, 980px)' }}>
          <thead className="table-data-head-sticky">
            <tr>
              <th className="!text-left">Estrutura</th>
              <th>Orçado</th>
              <th>Realizado</th>
              <th>Variação %</th>
              <th>Saldo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {flat.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--color-text2)]">
                  Nenhum dado para os filtros selecionados. Verifique ano/mês, cadastros e linhas de planejamento ou realizado
                  salvos.
                </td>
              </tr>
            ) : null}
            {flat.map((r) => {
              const hasKids = (r.children?.length ?? 0) > 0
              const isOpen = expanded.has(r.id)
              const isRoot = r.id === 'root'
              const isNatureSection = r.level === 1
              const isHighlightRow = isRoot || isNatureSection
              const saldoClass = saldoToneClass(r.balance, r.budgeted, r.actual, r.natureSection)
              return (
                <tr
                  key={r.id}
                  className={cn(
                    isHighlightRow && 'bg-[var(--color-bg4)]/85 font-semibold hover:bg-slate-600/35',
                  )}
                >
                  <td className="!text-left">
                    <div className="flex items-center justify-start gap-1.5" style={{ paddingLeft: r.depth * 16 }}>
                      <button
                        type="button"
                        className={cn('btn-table-icon', !hasKids && 'invisible')}
                        onClick={() => toggle(r.id)}
                        aria-label={isOpen ? 'Recolher' : 'Expandir'}
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className={cn(
                          'text-[var(--color-text)]',
                          r.code && !isHighlightRow && 'font-mono text-[11px]',
                          isHighlightRow && 'text-sm tracking-tight',
                        )}
                      >
                        {formatStructureLabel(r)}
                      </span>
                    </div>
                  </td>
                  <td className={cn('font-mono text-xs', isHighlightRow && 'text-sm')}>{formatBRL(r.budgeted)}</td>
                  <td className={cn('font-mono text-xs', isHighlightRow && 'text-sm')}>{formatBRL(r.actual)}</td>
                  <td className={cn('font-mono text-xs', isHighlightRow && 'text-sm')}>
                    {formatPct(executionPct(r.budgeted, r.actual))}%
                  </td>
                  <td
                    className={cn(
                      'font-mono text-xs',
                      isHighlightRow && 'text-sm',
                      saldoClass,
                    )}
                  >
                    {formatSaldoDisplay(r.balance, r.budgeted, r.actual, r.natureSection)}
                  </td>
                  <td>
                    <StatusBadge
                      health={r.health}
                      variant={r.natureSection === 'receitas' ? 'revenue' : 'default'}
                      className={isHighlightRow ? 'font-semibold' : undefined}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
