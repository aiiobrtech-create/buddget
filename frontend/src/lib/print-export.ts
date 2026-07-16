export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Abre diálogo de impressão / Salvar como PDF. Retorna false se o navegador bloquear. */
export function openPrintHtml(html: string): boolean {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Impressão BUDDGET')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'

  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument ?? win?.document
  if (!win || !doc) {
    iframe.remove()
    return openPrintHtmlViaPopup(html)
  }

  doc.open()
  doc.write(html)
  doc.close()

  let printed = false
  const runPrint = () => {
    if (printed) return
    printed = true
    win.focus()
    win.print()
    window.setTimeout(() => iframe.remove(), 1000)
  }

  win.addEventListener('load', () => window.setTimeout(runPrint, 150), { once: true })
  window.setTimeout(runPrint, 400)

  return true
}

function openPrintHtmlViaPopup(html: string): boolean {
  const popup = window.open('about:blank', '_blank')
  if (!popup) return false

  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  window.setTimeout(() => popup.print(), 250)
  return true
}

export type PrintExportColumn = {
  header: string
  align?: 'left' | 'right' | 'center'
  width?: string
}

export type PrintExportCellTone = 'default' | 'saldo-green' | 'saldo-red'

export type PrintStatusBadgeTone = 'ok' | 'attention' | 'over' | 'revenue-over'

export type PrintExportRow = {
  cells: string[]
  variant?: 'default' | 'section' | 'root'
  depth?: number
  cellTones?: (PrintExportCellTone | undefined)[]
  statusBadge?: { label: string; tone: PrintStatusBadgeTone }
}

export type PrintPageOrientation = 'portrait' | 'landscape'

function buildPrintStyles(orientation: PrintPageOrientation = 'landscape'): string {
  const pageSize = orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'
  const pageMargin = orientation === 'portrait' ? '12mm 10mm 16mm 10mm' : '10mm 8mm 14mm 8mm'

  return `
  @page {
    size: ${pageSize};
    margin: ${pageMargin};
  }
  :root {
    color-scheme: light;
    --ink: #0b1220;
    --ink-muted: #5b6475;
    --line: #d8dee8;
    --surface: #ffffff;
    --surface-2: #f4f6fa;
    --surface-3: #e8edf5;
    --ok: #047857;
    --ok-bg: #ecfdf5;
    --attention: #b45309;
    --attention-bg: #fffbeb;
    --over: #be123c;
    --over-bg: #fff1f2;
    --revenue-over: #0369a1;
    --revenue-over-bg: #f0f9ff;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--ink);
    background: #eef1f6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .report {
    max-width: 100%;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  }
  .report-hero {
    padding: 22px 28px 20px;
    background: linear-gradient(135deg, #0b1220 0%, #162033 48%, #1e3a5f 100%);
    color: #f8fafc;
    position: relative;
  }
  .report-hero::after {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #22d3ee 40%, transparent);
  }
  .report-hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 14px;
  }
  .report-brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .report-brand-mark {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #93c5fd;
  }
  .report-brand-sub {
    font-size: 11px;
    color: #94a3b8;
  }
  .report-hero-date {
    font-size: 11px;
    color: #cbd5e1;
    text-align: right;
    white-space: nowrap;
  }
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #fff;
  }
  .report-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }
  .report-meta li {
    font-size: 11px;
    color: #334155;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 5px 11px;
  }
  .report-body {
    padding: 18px 22px 22px;
  }
  .report-cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .report-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-card-title {
    margin: 0;
    padding: 11px 14px 10px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%);
    border-bottom: 1px solid var(--line);
  }
  .report-card .table-wrap {
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .report-card-empty {
    padding: 18px 14px;
    font-size: 11px;
    color: var(--ink-muted);
    text-align: center;
  }
  .table-wrap {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    background: var(--surface);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10.5px;
    line-height: 1.4;
  }
  col.col-structure { width: 34%; }
  col.col-money { width: 13%; }
  col.col-pct { width: 9%; }
  col.col-status { width: 18%; }
  thead th {
    padding: 11px 12px;
    border-bottom: 1px solid #1e293b;
    background: #111827;
    color: #f1f5f9;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    vertical-align: middle;
  }
  tbody td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
    word-break: break-word;
  }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr.row-root td {
    background: #111827;
    color: #f8fafc;
    font-weight: 650;
    font-size: 11px;
    border-bottom-color: #334155;
  }
  tbody tr.row-root .num { color: #f8fafc; }
  tbody tr.row-root .tone-saldo-green { color: #6ee7b7; }
  tbody tr.row-root .tone-saldo-red { color: #fda4af; }
  tbody tr.row-section td {
    background: var(--surface-3);
    font-weight: 600;
    color: var(--ink);
    font-size: 10.5px;
  }
  tbody tr.row-default:nth-child(even) td {
    background: #fbfcfe;
  }
  .structure-cell { display: block; }
  .structure-label { display: block; }
  .structure-code {
    display: block;
    margin-top: 1px;
    font-size: 9px;
    color: var(--ink-muted);
    font-family: ui-monospace, Consolas, monospace;
  }
  tbody tr.row-root .structure-code { color: #94a3b8; }
  .align-left { text-align: left; }
  .align-right { text-align: right; }
  .align-center { text-align: center; }
  .num {
    font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", Consolas, monospace;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tone-saldo-green { color: var(--ok); font-weight: 650; }
  .tone-saldo-red { color: var(--over); font-weight: 650; }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 600;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .badge-ok { color: var(--ok); background: var(--ok-bg); border-color: #a7f3d0; }
  .badge-attention { color: var(--attention); background: var(--attention-bg); border-color: #fde68a; }
  .badge-over { color: var(--over); background: var(--over-bg); border-color: #fecdd3; }
  .badge-revenue-over { color: var(--revenue-over); background: var(--revenue-over-bg); border-color: #bae6fd; }
  tbody tr.row-root .badge-ok { color: #6ee7b7; background: rgba(16, 185, 129, 0.12); border-color: rgba(110, 231, 183, 0.35); }
  tbody tr.row-root .badge-attention { color: #fcd34d; background: rgba(251, 191, 36, 0.12); border-color: rgba(252, 211, 77, 0.35); }
  tbody tr.row-root .badge-over { color: #fda4af; background: rgba(244, 63, 94, 0.12); border-color: rgba(253, 164, 175, 0.35); }
  tbody tr.row-root .badge-revenue-over { color: #7dd3fc; background: rgba(56, 189, 248, 0.12); border-color: rgba(125, 211, 252, 0.35); }
  .report-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    padding: 0 4px;
    font-size: 9px;
    color: var(--ink-muted);
  }
  @media print {
    body { background: #fff; padding: 0; }
    .report { border: 0; border-radius: 0; box-shadow: none; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .report-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 6px 8mm;
      background: #fff;
      border-top: 1px solid var(--line);
    }
  }
`
}

function cellToneClass(tone?: PrintExportCellTone): string {
  if (tone === 'saldo-green') return 'tone-saldo-green'
  if (tone === 'saldo-red') return 'tone-saldo-red'
  return ''
}

function badgeClass(tone: PrintStatusBadgeTone): string {
  return `badge badge-${tone}`
}

function renderStructureCell(value: string, depth = 0, variant: PrintExportRow['variant'] = 'default'): string {
  const indent = depth > 0 ? `padding-left:${depth * 14}px` : ''
  const parts = value.split(' — ')
  const hasCode = parts.length > 1 && /^\d/.test(parts[0] ?? '')
  if (hasCode) {
    const code = parts[0] ?? ''
    const label = parts.slice(1).join(' — ')
    return `<span class="structure-cell" style="${indent}"><span class="structure-label">${escapeHtml(label)}</span><span class="structure-code">${escapeHtml(code)}</span></span>`
  }
  const weight = variant === 'section' ? 'font-weight:600' : ''
  return `<span class="structure-cell structure-label" style="${indent}${weight ? `;${weight}` : ''}">${escapeHtml(value)}</span>`
}

function renderCell(
  value: string,
  column: PrintExportColumn,
  columnIndex: number,
  row: PrintExportRow,
): string {
  const align = column.align ?? 'left'
  const tone = row.cellTones?.[columnIndex]
  const numeric = columnIndex > 0 && column.align === 'right' ? ' num' : ''

  if (columnIndex === 0) {
    return `<td class="align-${align}">${renderStructureCell(value, row.depth ?? 0, row.variant)}</td>`
  }

  if (row.statusBadge && columnIndex === row.cells.length - 1) {
    const badge = row.statusBadge
    return `<td class="align-${align}"><span class="${badgeClass(badge.tone)}">${escapeHtml(badge.label)}</span></td>`
  }

  return `<td class="align-${align}${numeric} ${cellToneClass(tone)}">${escapeHtml(value)}</td>`
}

function renderColgroup(columns: PrintExportColumn[]): string {
  return columns
    .map((col, index) => {
      if (index === 0) return '<col class="col-structure" />'
      if (col.header.toLowerCase().includes('status')) return '<col class="col-status" />'
      if (col.header.includes('%')) return '<col class="col-pct" />'
      return '<col class="col-money" />'
    })
    .join('')
}

function renderTable(columns: PrintExportColumn[], rows: PrintExportRow[]): string {
  const th = columns
    .map((col) => {
      const align = col.align ?? 'left'
      return `<th class="align-${align}">${escapeHtml(col.header)}</th>`
    })
    .join('')

  const tr = rows
    .map((row) => {
      const rowClass =
        row.variant === 'root' ? 'row-root' : row.variant === 'section' ? 'row-section' : 'row-default'
      const cells = row.cells
        .map((value, index) => renderCell(value, columns[index] ?? { header: '' }, index, row))
        .join('')
      return `<tr class="${rowClass}">${cells}</tr>`
    })
    .join('')

  return `<div class="table-wrap"><table><colgroup>${renderColgroup(columns)}</colgroup><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`
}

export function printTableExport(params: {
  documentTitle: string
  heading: string
  subtitleLines?: string[]
  pageOrientation?: PrintPageOrientation
  columnHeaders?: string[]
  bodyRows?: string[][]
  columns?: PrintExportColumn[]
  rows?: PrintExportRow[]
}): boolean {
  const exportedAt = new Date().toLocaleString('pt-BR')
  const subtitles = params.subtitleLines ?? []
  const pageOrientation = params.pageOrientation ?? 'landscape'
  const printStyles = buildPrintStyles(pageOrientation)

  const columns: PrintExportColumn[] =
    params.columns ??
    (params.columnHeaders ?? []).map((header, index) => ({
      header,
      align: index === 0 ? 'left' : 'right',
    }))

  const rows: PrintExportRow[] =
    params.rows ??
    (params.bodyRows ?? []).map((cells) => ({
      cells,
      variant: 'default',
    }))

  const meta = subtitles.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
  const table = renderTable(columns, rows)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(params.documentTitle)}</title>
  <style>${printStyles}</style>
</head>
<body>
  <div class="report">
    <div class="report-hero">
      <div class="report-hero-top">
        <div class="report-brand">
          <span class="report-brand-mark">BUDDGET</span>
          <span class="report-brand-sub">Gestão orçamentária</span>
        </div>
        <div class="report-hero-date">${escapeHtml(exportedAt)}</div>
      </div>
      <h1>${escapeHtml(params.heading)}</h1>
    </div>
    <div class="report-body">
      ${meta ? `<ul class="report-meta">${meta}</ul>` : ''}
      ${table}
      <div class="report-footer">
        <span>Documento confidencial · uso interno</span>
        <span>Gerado pelo BUDDGET · ${escapeHtml(exportedAt)}</span>
      </div>
    </div>
  </div>
</body>
</html>`

  return openPrintHtml(html)
}

export type PrintExportCard = {
  title: string
  columns: PrintExportColumn[]
  rows: PrintExportRow[]
  emptyMessage?: string
}

export function printCardsExport(params: {
  documentTitle: string
  heading: string
  subtitleLines?: string[]
  pageOrientation?: PrintPageOrientation
  cards: PrintExportCard[]
}): boolean {
  const exportedAt = new Date().toLocaleString('pt-BR')
  const subtitles = params.subtitleLines ?? []
  const pageOrientation = params.pageOrientation ?? 'portrait'
  const printStyles = buildPrintStyles(pageOrientation)

  const cardsHtml = params.cards
    .map((card) => {
      const table =
        card.rows.length > 0
          ? renderTable(card.columns, card.rows)
          : `<div class="report-card-empty">${escapeHtml(card.emptyMessage ?? 'Sem dados para exibir.')}</div>`
      return `<section class="report-card"><h2 class="report-card-title">${escapeHtml(card.title)}</h2>${table}</section>`
    })
    .join('')

  const meta = subtitles.map((line) => `<li>${escapeHtml(line)}</li>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(params.documentTitle)}</title>
  <style>${printStyles}</style>
</head>
<body>
  <div class="report">
    <div class="report-hero">
      <div class="report-hero-top">
        <div class="report-brand">
          <span class="report-brand-mark">BUDDGET</span>
          <span class="report-brand-sub">Gestão orçamentária</span>
        </div>
        <div class="report-hero-date">${escapeHtml(exportedAt)}</div>
      </div>
      <h1>${escapeHtml(params.heading)}</h1>
    </div>
    <div class="report-body">
      ${meta ? `<ul class="report-meta">${meta}</ul>` : ''}
      <div class="report-cards">${cardsHtml}</div>
      <div class="report-footer">
        <span>Documento confidencial · uso interno</span>
        <span>Gerado pelo BUDDGET · ${escapeHtml(exportedAt)}</span>
      </div>
    </div>
  </div>
</body>
</html>`

  return openPrintHtml(html)
}
