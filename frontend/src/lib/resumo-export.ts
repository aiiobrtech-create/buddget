import type { BudgetResumo, ResumoHighlight, ResumoLine, ResumoSection } from '@/types/resumo'
import {
  formatSaldoDisplay,
  isReceitasSaldoFavoravel,
  saldoToneClass,
  type NatureSectionId,
} from '@/lib/formatters/saldo-display'
import { formatBRL } from '@/lib/formatters/currency'
import { formatPct } from '@/lib/formatters/percent'
import type { ExcelCellAccent, ExcelRowVariant } from '@/lib/excel-styles'
import { buildFormattedSheet, downloadWorkbook } from '@/lib/excel-export'
import {
  printCardsExport,
  type PrintExportCard,
  type PrintExportCellTone,
  type PrintExportRow,
} from '@/lib/print-export'

export type ResumoExportRowKind = 'section-header' | 'line' | 'highlight' | 'spacer'

export type ResumoExportRow = {
  kind: ResumoExportRowKind
  label: string
  planned: number | null
  actual: number | null
  variationPct: number | null
  balance: number | null
  sectionId?: NatureSectionId
  isTotal?: boolean
  outlineLevel: number
  excelVariant: ExcelRowVariant
  pdfVariant: 'default' | 'section' | 'root'
}

const RESUMO_SECTION_COLUMNS = [
  { header: 'Categoria', align: 'left' as const },
  { header: 'Orçado', align: 'right' as const },
  { header: 'Realizado', align: 'right' as const },
  { header: 'Variação %', align: 'right' as const },
  { header: 'Saldo', align: 'right' as const },
]

const RESUMO_HIGHLIGHT_COLUMNS = [
  { header: 'Orçado', align: 'right' as const },
  { header: 'Realizado', align: 'right' as const },
  { header: 'Variação %', align: 'right' as const },
]

function lineToPdfRow(line: ResumoLine, sectionId: NatureSectionId): PrintExportRow {
  const planned = line.planned
  const actual = line.actual
  const balance = line.balance

  return {
    variant: line.isTotal ? 'section' : 'default',
    depth: 0,
    cells: [
      line.label,
      formatBRL(planned),
      formatBRL(actual),
      `${formatPct(line.variationPct)}%`,
      formatSaldoDisplay(balance, planned, actual, sectionId),
    ],
    cellTones: [undefined, undefined, undefined, undefined, pdfSaldoTone(planned, actual, balance, sectionId)],
  }
}

function buildSectionPdfCard(section: ResumoSection): PrintExportCard {
  const sectionId = section.id as NatureSectionId
  return {
    title: section.title,
    columns: RESUMO_SECTION_COLUMNS,
    rows: section.rows.map((line) => lineToPdfRow(line, sectionId)),
    emptyMessage: 'Sem lançamentos no período selecionado.',
  }
}

function buildHighlightPdfCard(highlight: ResumoHighlight, variant: 'section' | 'root'): PrintExportCard {
  return {
    title: highlight.title,
    columns: RESUMO_HIGHLIGHT_COLUMNS,
    rows: [
      {
        variant,
        depth: 0,
        cells: [
          formatBRL(highlight.planned),
          formatBRL(highlight.actual),
          `${formatPct(highlight.variationPct)}%`,
        ],
      },
    ],
  }
}

function buildResumoPdfCards(data: BudgetResumo): PrintExportCard[] {
  const byId = new Map(data.sections.map((s) => [s.id, s]))
  return [
    buildSectionPdfCard(byId.get('receitas') ?? { id: 'receitas', title: 'Receitas', rows: [] }),
    buildSectionPdfCard(byId.get('despesas') ?? { id: 'despesas', title: 'Despesas', rows: [] }),
    buildHighlightPdfCard(data.operationalSurplus, 'section'),
    buildSectionPdfCard(byId.get('capex') ?? { id: 'capex', title: 'Capex/Imobilizado', rows: [] }),
    buildHighlightPdfCard(data.netSurplus, 'root'),
  ]
}

function saldoExportValue(
  planned: number,
  actual: number,
  balance: number,
  sectionId?: NatureSectionId,
): number {
  return isReceitasSaldoFavoravel(planned, actual, sectionId) ? Math.abs(balance) : balance
}

function excelSaldoAccent(
  planned: number,
  actual: number,
  balance: number,
  sectionId?: NatureSectionId,
): ExcelCellAccent | undefined {
  const toneClass = saldoToneClass(balance, planned, actual, sectionId)
  if (toneClass === 'text-emerald-400') return 'saldo-green'
  if (toneClass === 'text-rose-400') return 'saldo-red'
  return undefined
}

function pdfSaldoTone(
  planned: number,
  actual: number,
  balance: number,
  sectionId?: NatureSectionId,
): PrintExportCellTone | undefined {
  const toneClass = saldoToneClass(balance, planned, actual, sectionId)
  if (toneClass === 'text-emerald-400') return 'saldo-green'
  if (toneClass === 'text-rose-400') return 'saldo-red'
  return undefined
}

function pushSectionRows(out: ResumoExportRow[], section: ResumoSection) {
  if (!section.rows.length) return

  out.push({
    kind: 'section-header',
    label: section.title.toUpperCase(),
    planned: null,
    actual: null,
    variationPct: null,
    balance: null,
    sectionId: section.id as NatureSectionId,
    outlineLevel: 0,
    excelVariant: 'section',
    pdfVariant: 'section',
  })

  for (const row of section.rows) {
    const isTotal = Boolean(row.isTotal)
    out.push({
      kind: 'line',
      label: row.label,
      planned: row.planned,
      actual: row.actual,
      variationPct: row.variationPct,
      balance: row.balance,
      sectionId: section.id as NatureSectionId,
      isTotal,
      outlineLevel: isTotal ? 0 : 1,
      excelVariant: isTotal ? 'section' : 'default',
      pdfVariant: isTotal ? 'section' : 'default',
    })
  }

  out.push({
    kind: 'spacer',
    label: '',
    planned: null,
    actual: null,
    variationPct: null,
    balance: null,
    outlineLevel: 0,
    excelVariant: 'default',
    pdfVariant: 'default',
  })
}

function pushHighlightRow(
  out: ResumoExportRow[],
  highlight: ResumoHighlight,
  pdfVariant: 'section' | 'root',
) {
  const balance = highlight.planned - highlight.actual
  out.push({
    kind: 'highlight',
    label: highlight.title,
    planned: highlight.planned,
    actual: highlight.actual,
    variationPct: highlight.variationPct,
    balance,
    outlineLevel: 0,
    excelVariant: pdfVariant === 'root' ? 'root' : 'section',
    pdfVariant,
  })
  out.push({
    kind: 'spacer',
    label: '',
    planned: null,
    actual: null,
    variationPct: null,
    balance: null,
    outlineLevel: 0,
    excelVariant: 'default',
    pdfVariant: 'default',
  })
}

export function buildResumoExportRows(data: BudgetResumo): ResumoExportRow[] {
  const out: ResumoExportRow[] = []
  const byId = new Map(data.sections.map((s) => [s.id, s]))

  pushSectionRows(out, byId.get('receitas') ?? { id: 'receitas', title: 'Receitas', rows: [] })
  pushSectionRows(out, byId.get('despesas') ?? { id: 'despesas', title: 'Despesas', rows: [] })
  pushHighlightRow(out, data.operationalSurplus, 'section')
  pushSectionRows(out, byId.get('capex') ?? { id: 'capex', title: 'Capex/Imobilizado', rows: [] })
  pushHighlightRow(out, data.netSurplus, 'root')

  while (out.length && out[out.length - 1]?.kind === 'spacer') {
    out.pop()
  }

  return out
}

export function buildResumoExcelRowValues(row: ResumoExportRow): (string | number)[] {
  if (row.kind === 'section-header' || row.kind === 'spacer') {
    return [row.label, '', '', '', '']
  }

  const planned = row.planned ?? 0
  const actual = row.actual ?? 0
  const balance = row.balance ?? 0

  return [
    row.label,
    planned,
    actual,
    row.variationPct ?? 0,
    saldoExportValue(planned, actual, balance, row.sectionId),
  ]
}

export function buildResumoExcelRowMeta(row: ResumoExportRow) {
  if (row.kind === 'spacer') {
    return {
      outlineLevel: row.outlineLevel,
      variant: row.excelVariant,
      indent: 0,
      cellAccents: undefined as (ExcelCellAccent | undefined)[] | undefined,
    }
  }

  const planned = row.planned ?? 0
  const actual = row.actual ?? 0
  const balance = row.balance ?? 0
  const indent = row.kind === 'line' && !row.isTotal ? 1 : 0

  return {
    outlineLevel: row.outlineLevel,
    variant: row.excelVariant,
    indent,
    cellAccents: [
      undefined,
      undefined,
      undefined,
      undefined,
      row.planned === null ? undefined : excelSaldoAccent(planned, actual, balance, row.sectionId),
    ] as (ExcelCellAccent | undefined)[],
  }
}

export function exportResumoToPdf(data: BudgetResumo) {
  printCardsExport({
    documentTitle: `BUDDGET · Resumo ${data.year}`,
    heading: `Resumo Orçamento ${data.year}`,
    pageOrientation: 'portrait',
    subtitleLines: [
      'Filtros aplicados na tela',
      `Exportado em ${new Date().toLocaleString('pt-BR')}`,
    ],
    cards: buildResumoPdfCards(data),
  })
}

export function exportResumoToXlsx(data: BudgetResumo) {
  const exportedAt = new Date().toLocaleString('pt-BR')
  const rows = buildResumoExportRows(data)

  const sheet = buildFormattedSheet({
    sheetName: 'Resumo',
    title: `Resumo Orçamento ${data.year}`,
    subtitles: ['BUDDGET · Gestão orçamentária', `Exportado em ${exportedAt}`],
    headers: ['Categoria', 'Orçado', 'Realizado', 'Variação %', 'Saldo'],
    headerAligns: ['left', 'right', 'right', 'right', 'right'],
    rows: rows.map((row) => buildResumoExcelRowValues(row)),
    rowMeta: rows.map((row) => buildResumoExcelRowMeta(row)),
    outlineSummaryAbove: false,
    collapsedOutlineLevel: 0,
    columnWidths: [48, 16, 16, 12, 16],
    currencyColumnIndexes: [1, 2, 4],
    percentColumnIndexes: [3],
  })

  const stamp = new Date().toISOString().slice(0, 10)
  downloadWorkbook(sheet, 'Resumo', `buddget-resumo-${data.year}-${stamp}.xlsx`)
}
