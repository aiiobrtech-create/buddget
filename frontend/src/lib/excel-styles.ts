/** Paleta alinhada ao tema escuro do app (slate / emerald / rose / sky). */
export const EXCEL_PALETTE = {
  ink: '0F172A',
  inkMuted: '64748B',
  surface: 'FFFFFF',
  surfaceMuted: 'F8FAFC',
  highlight: '1E293B',
  highlightBorder: '475569',
  onHighlight: 'F8FAFC',
  header: '111827',
  onHeader: 'F1F5F9',
  border: 'E2E8F0',
  saldoGreen: '34D399',
  saldoRed: 'FB7185',
  statusOkBg: 'ECFDF5',
  statusOkText: '047857',
  statusAttentionBg: 'FFFBEB',
  statusAttentionText: 'B45309',
  statusOverBg: 'FFF1F2',
  statusOverText: 'BE123C',
  statusRevenueBg: 'F0F9FF',
  statusRevenueText: '0369A1',
  statusOkBgDark: '064E3B',
  statusOkTextDark: '6EE7B7',
  statusAttentionBgDark: '78350F',
  statusAttentionTextDark: 'FCD34D',
  statusOverBgDark: '881337',
  statusOverTextDark: 'FDA4AF',
  statusRevenueBgDark: '0C4A6E',
  statusRevenueTextDark: '7DD3FC',
} as const

export type ExcelRowVariant = 'default' | 'section' | 'root'

export type ExcelCellAccent =
  | 'saldo-green'
  | 'saldo-red'
  | 'status-ok'
  | 'status-attention'
  | 'status-over'
  | 'status-revenue-over'

type CellBorder = {
  style: 'thin'
  color: { rgb: string }
}

type ExcelCellStyle = {
  font?: {
    bold?: boolean
    sz?: number
    color?: { rgb: string }
    name?: string
  }
  fill?: {
    patternType: 'solid'
    fgColor: { rgb: string }
  }
  alignment?: {
    horizontal?: 'left' | 'center' | 'right'
    vertical?: 'center'
    indent?: number
    wrapText?: boolean
  }
  border?: {
    top?: CellBorder
    bottom?: CellBorder
    left?: CellBorder
    right?: CellBorder
  }
  numFmt?: string
}

function border(color: string = EXCEL_PALETTE.border): ExcelCellStyle['border'] {
  const side: CellBorder = { style: 'thin', color: { rgb: color } }
  return { top: side, bottom: side, left: side, right: side }
}

function mergeStyles(base: ExcelCellStyle, extra?: ExcelCellStyle): ExcelCellStyle {
  if (!extra) return base
  return {
    font: { ...base.font, ...extra.font },
    fill: extra.fill ?? base.fill,
    alignment: { ...base.alignment, ...extra.alignment },
    border: extra.border ?? base.border,
    numFmt: extra.numFmt ?? base.numFmt,
  }
}

function highlightRowBase(indent = 0, align: 'left' | 'center' | 'right' = 'left'): ExcelCellStyle {
  return {
    font: { bold: true, sz: 11, color: { rgb: EXCEL_PALETTE.onHighlight }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.highlight } },
    alignment: { horizontal: align, vertical: 'center', indent },
    border: border(EXCEL_PALETTE.highlightBorder),
  }
}

function defaultRowBase(indent = 0, align: 'left' | 'center' | 'right' = 'left'): ExcelCellStyle {
  return {
    font: { sz: 10, color: { rgb: EXCEL_PALETTE.ink }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.surface } },
    alignment: { horizontal: align, vertical: 'center', indent },
    border: border(),
  }
}

function zebraRowBase(indent = 0, align: 'left' | 'center' | 'right' = 'left'): ExcelCellStyle {
  return mergeStyles(defaultRowBase(indent, align), {
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.surfaceMuted } },
  })
}

export function excelHeaderCellStyle(): ExcelCellStyle {
  return {
    font: { bold: true, sz: 10, color: { rgb: EXCEL_PALETTE.onHeader }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.header } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: border(EXCEL_PALETTE.highlightBorder),
  }
}

export function excelTitleCellStyle(): ExcelCellStyle {
  return {
    font: { bold: true, sz: 16, color: { rgb: EXCEL_PALETTE.onHighlight }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.header } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

export function excelSubtitleCellStyle(): ExcelCellStyle {
  return {
    font: { sz: 10, color: { rgb: EXCEL_PALETTE.inkMuted }, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.surfaceMuted } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function accentOnHighlight(accent: ExcelCellAccent): ExcelCellStyle {
  switch (accent) {
    case 'saldo-green':
      return { font: { bold: true, color: { rgb: EXCEL_PALETTE.saldoGreen } } }
    case 'saldo-red':
      return { font: { bold: true, color: { rgb: EXCEL_PALETTE.saldoRed } } }
    case 'status-ok':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusOkTextDark } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusOkBgDark } },
      }
    case 'status-attention':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusAttentionTextDark } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusAttentionBgDark } },
      }
    case 'status-over':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusOverTextDark } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusOverBgDark } },
      }
    case 'status-revenue-over':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusRevenueTextDark } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusRevenueBgDark } },
      }
  }
}

function accentOnDefault(accent: ExcelCellAccent): ExcelCellStyle {
  switch (accent) {
    case 'saldo-green':
      return { font: { bold: true, color: { rgb: '059669' } } }
    case 'saldo-red':
      return { font: { bold: true, color: { rgb: 'E11D48' } } }
    case 'status-ok':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusOkText } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusOkBg } },
      }
    case 'status-attention':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusAttentionText } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusAttentionBg } },
      }
    case 'status-over':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusOverText } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusOverBg } },
      }
    case 'status-revenue-over':
      return {
        font: { bold: true, color: { rgb: EXCEL_PALETTE.statusRevenueText } },
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.statusRevenueBg } },
      }
  }
}

export function excelDataCellStyle(params: {
  variant: ExcelRowVariant
  zebra?: boolean
  indent?: number
  align?: 'left' | 'center' | 'right'
  accent?: ExcelCellAccent
  numFmt?: string
}): ExcelCellStyle {
  const align = params.align ?? (params.indent ? 'left' : 'left')
  const indent = params.indent ?? 0
  const isHighlight = params.variant === 'section' || params.variant === 'root'

  let base =
    params.variant === 'root'
      ? mergeStyles(highlightRowBase(indent, align), {
          font: { bold: true, sz: 11, color: { rgb: EXCEL_PALETTE.onHighlight } },
          fill: { patternType: 'solid', fgColor: { rgb: EXCEL_PALETTE.header } },
        })
      : params.variant === 'section'
        ? highlightRowBase(indent, align)
        : params.zebra
          ? zebraRowBase(indent, align)
          : defaultRowBase(indent, align)

  if (params.numFmt) {
    base = { ...base, numFmt: params.numFmt }
  }

  if (params.accent) {
    base = mergeStyles(base, isHighlight ? accentOnHighlight(params.accent) : accentOnDefault(params.accent))
  }

  if (params.align === 'right' || params.numFmt) {
    base = mergeStyles(base, {
      font: { ...base.font, name: 'Consolas' },
      alignment: { ...base.alignment, horizontal: params.align ?? 'right' },
    })
  }

  return base
}
