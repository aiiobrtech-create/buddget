import XLSX from 'xlsx-js-style'

/** Modelo de importação de realizado: uma coluna por campo. */
export const ACTUAL_IMPORT_COLUMNS = [
  { key: 'code', header: 'Código', required: true },
  { key: 'date', header: 'Data', required: true },
  { key: 'description', header: 'Descrição', required: true },
  { key: 'amount', header: 'Valor', required: true },
] as const

export const ACTUAL_IMPORT_REQUIRED_COLUMNS = ACTUAL_IMPORT_COLUMNS.map((c) => c.header)
export const ACTUAL_IMPORT_OPTIONAL_COLUMNS: string[] = []

export const ACTUAL_IMPORT_TEMPLATE_FILENAME = 'modelo-importacao-realizado.xlsx'

const EXAMPLE_ROW = {
  Código: 'GRP.EMP.CLS.CAT.CC.ITEM',
  Data: '15/01/2026',
  Descrição: 'Exemplo de despesa operacional',
  Valor: 1500.5,
}

/** Gera e baixa um XLSX com colunas Código, Data, Descrição e Valor. */
export function downloadActualImportTemplate() {
  const headers = ACTUAL_IMPORT_COLUMNS.map((c) => c.header)
  const sheet = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: [...headers] })

  sheet['!cols'] = [
    { wch: 36 },
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Realizado')
  XLSX.writeFile(workbook, ACTUAL_IMPORT_TEMPLATE_FILENAME)
}
