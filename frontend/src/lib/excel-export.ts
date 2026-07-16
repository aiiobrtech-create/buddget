import XLSX from 'xlsx-js-style'
import {
  excelDataCellStyle,
  excelHeaderCellStyle,
  excelSubtitleCellStyle,
  excelTitleCellStyle,
  type ExcelCellAccent,
  type ExcelRowVariant,
} from '@/lib/excel-styles'

const BRL_FORMAT = '"R$"#,##0.00'
const PCT_FORMAT = '0.00"%"'

export type FormattedSheetRowMeta = {
  outlineLevel?: number
  variant?: ExcelRowVariant
  indent?: number
  cellAccents?: (ExcelCellAccent | undefined)[]
}

export type FormattedSheetOptions = {
  sheetName: string
  title: string
  subtitles?: string[]
  headers: string[]
  headerAligns?: ('left' | 'center' | 'right')[]
  rows: (string | number)[][]
  columnWidths?: number[]
  currencyColumnIndexes?: number[]
  percentColumnIndexes?: number[]
  rowMeta?: FormattedSheetRowMeta[]
  outlineSummaryAbove?: boolean
  collapsedOutlineLevel?: number
}

type StyledCell = XLSX.CellObject & { s?: ReturnType<typeof excelDataCellStyle> }

function setCellStyle(ws: XLSX.WorkSheet, rowIndex: number, colIndex: number, style: ReturnType<typeof excelDataCellStyle>) {
  const ref = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
  const cell = (ws[ref] ?? { t: 's', v: '' }) as StyledCell
  cell.s = style
  ws[ref] = cell
}

function applyNumberFormat(
  ws: XLSX.WorkSheet,
  rowIndex: number,
  colIndex: number,
  numFmt: string,
  style: ReturnType<typeof excelDataCellStyle>,
) {
  const ref = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
  const cell = (ws[ref] ?? { t: 'n', v: 0 }) as StyledCell
  cell.z = numFmt
  cell.s = { ...style, numFmt }
  ws[ref] = cell
}

function applyRowOutlines(
  ws: XLSX.WorkSheet,
  dataStartRow: number,
  rowMeta: FormattedSheetRowMeta[] | undefined,
  outlineSummaryAbove: boolean,
  collapsedOutlineLevel?: number,
) {
  if (!rowMeta?.length) return

  ws['!rows'] ??= []
  const lastRow = dataStartRow + rowMeta.length - 1
  for (let excelRow = 0; excelRow <= lastRow; excelRow++) {
    ws['!rows'][excelRow] ??= {}
  }

  for (let i = 0; i < rowMeta.length; i++) {
    const excelRow = dataStartRow + i
    const level = rowMeta[i]?.outlineLevel ?? 0
    ws['!rows'][excelRow] = {
      ...(ws['!rows'][excelRow] ?? {}),
      level,
    }
  }

  ws['!outline'] = {
    above: outlineSummaryAbove,
    left: false,
    summaryBelow: !outlineSummaryAbove,
    summaryRight: false,
  }

  if (collapsedOutlineLevel !== undefined) {
    ws['!views'] = [
      {
        state: 'frozen',
        ySplit: dataStartRow,
        topLeftCell: `A${dataStartRow + 1}`,
        activeCell: 'A1',
        outlineLevelRow: collapsedOutlineLevel,
      },
    ]
  }
}

function applySheetStyles(
  ws: XLSX.WorkSheet,
  options: FormattedSheetOptions,
  headerRowIndex: number,
  dataStartRow: number,
) {
  const { headers, subtitles = [], rows, rowMeta = [] } = options
  const lastCol = Math.max(headers.length - 1, 0)

  setCellStyle(ws, 0, 0, excelTitleCellStyle())
  for (let c = 1; c <= lastCol; c++) {
    setCellStyle(ws, 0, c, excelTitleCellStyle())
  }

  subtitles.forEach((_, index) => {
    const row = 1 + index
    for (let c = 0; c <= lastCol; c++) {
      setCellStyle(ws, row, c, excelSubtitleCellStyle())
    }
  })

  for (let c = 0; c < headers.length; c++) {
    const headerStyle = excelHeaderCellStyle()
    const align = options.headerAligns?.[c]
    if (align) {
      headerStyle.alignment = { ...headerStyle.alignment, horizontal: align }
    }
    if (c === 0) {
      headerStyle.alignment = { ...headerStyle.alignment, horizontal: 'left' }
    }
    setCellStyle(ws, headerRowIndex, c, headerStyle)
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const meta = rowMeta[rowIndex]
    const excelRow = dataStartRow + rowIndex
    const variant = meta?.variant ?? 'default'
    const indent = meta?.indent ?? 0
    const zebra = variant === 'default' && rowIndex % 2 === 1

    for (let col = 0; col < headers.length; col++) {
      const accent = meta?.cellAccents?.[col]
      const align =
        col === 0 ? 'left' : col === headers.length - 1 ? 'center' : 'right'
      const style = excelDataCellStyle({
        variant,
        zebra,
        indent: col === 0 ? indent : 0,
        align,
        accent,
        numFmt: options.currencyColumnIndexes?.includes(col)
          ? BRL_FORMAT
          : options.percentColumnIndexes?.includes(col)
            ? PCT_FORMAT
            : undefined,
      })

      if (options.currencyColumnIndexes?.includes(col) || options.percentColumnIndexes?.includes(col)) {
        const numFmt = options.currencyColumnIndexes?.includes(col) ? BRL_FORMAT : PCT_FORMAT
        applyNumberFormat(ws, excelRow, col, numFmt, style)
      } else {
        setCellStyle(ws, excelRow, col, style)
      }
    }
  }
}

export function buildFormattedSheet(options: FormattedSheetOptions): XLSX.WorkSheet {
  const { title, subtitles = [], headers, rows } = options
  const headerRowIndex = 2 + subtitles.length
  const dataStartRow = headerRowIndex + 1

  const topRows: (string | number)[][] = [[title], ...subtitles.map((line) => [line]), [], headers]
  const ws = XLSX.utils.aoa_to_sheet([...topRows, ...rows])

  const lastCol = Math.max(headers.length - 1, 0)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }]

  const defaultWidths = headers.map((_, index) => {
    if (index === 0) return 52
    if (options.percentColumnIndexes?.includes(index)) return 12
    return 16
  })
  ws['!cols'] = (options.columnWidths ?? defaultWidths).map((wch) => ({ wch }))

  if (options.collapsedOutlineLevel === undefined) {
    ws['!views'] = [{ state: 'frozen', ySplit: dataStartRow, topLeftCell: `A${dataStartRow + 1}`, activeCell: 'A1' }]
  }

  applyRowOutlines(
    ws,
    dataStartRow,
    options.rowMeta,
    options.outlineSummaryAbove ?? true,
    options.collapsedOutlineLevel,
  )

  applySheetStyles(ws, options, headerRowIndex, dataStartRow)

  return ws
}

export function downloadWorkbook(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  fileName: string,
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, sheetName.slice(0, 31))
  wb.Workbook ??= {}
  wb.Workbook.Views = [{ RTL: false }]
  XLSX.writeFile(wb, fileName)
}
