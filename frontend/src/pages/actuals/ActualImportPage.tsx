import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader, FileUploadZone } from '@/components/ui'
import { useToast } from '@/context/toast-context'
import { ACTUAL_IMPORT_REQUIRED_COLUMNS, downloadActualImportTemplate } from '@/lib/actual-import-template'
import { actualsService } from '@/services/modules/actuals.service'
import { getErrorMessage } from '@/services/api/errors'

function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildErrorReportTxt(input: {
  sourceFileName: string
  totalRows: number
  validRows: number
  errors: string[]
}) {
  return [
    'Relatório de erros — Importação de Realizado',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    `Arquivo: ${input.sourceFileName}`,
    `Total de linhas: ${input.totalRows}`,
    `Importados: ${input.validRows}`,
    `Erros: ${input.errors.length}`,
    '',
    'Detalhes:',
    ...input.errors,
    '',
  ].join('\r\n')
}

export function ActualImportPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState<{
    totalRows: number
    validRows: number
    invalidRows: number
    errors: string[]
    errorReportTxt: string | null
    errorReportFileName: string | null
  } | null>(null)

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || uploading) return

    setUploading(true)
    setLastResult(null)
    try {
      const result = await actualsService.importFile(file)
      const errors = Array.isArray(result.errors)
        ? result.errors.map((item) => String(item)).filter(Boolean)
        : []
      const errorReportTxt =
        result.errorReportTxt?.trim() ||
        (errors.length
          ? buildErrorReportTxt({
              sourceFileName: file.name,
              totalRows: result.totalRows ?? 0,
              validRows: result.validRows ?? 0,
              errors,
            })
          : null)
      const errorReportFileName =
        result.errorReportFileName?.trim() ||
        (errors.length ? `erros-importacao-realizado-${Date.now()}.txt` : null)

      setLastResult({
        totalRows: result.totalRows ?? 0,
        validRows: result.validRows ?? 0,
        invalidRows: result.invalidRows ?? errors.length,
        errors,
        errorReportTxt,
        errorReportFileName,
      })

      if (errorReportTxt && errorReportFileName) {
        downloadTextFile(errorReportTxt, errorReportFileName)
      }

      if ((result.invalidRows ?? errors.length) > 0 && (result.validRows ?? 0) === 0) {
        toast.push({
          variant: 'error',
          title: 'Importação falhou',
          message: errorReportFileName
            ? `Relatório baixado: ${errorReportFileName}`
            : errors[0] ?? `${result.invalidRows} linha(s) com erro.`,
        })
      } else if ((result.invalidRows ?? 0) > 0) {
        toast.push({
          variant: 'info',
          title: 'Importação parcial',
          message: errorReportFileName
            ? `${result.validRows} ok. Relatório de erros: ${errorReportFileName}`
            : `${result.validRows} ok · ${result.invalidRows} com erro.`,
        })
      } else {
        toast.push({
          variant: 'success',
          title: 'Importação concluída',
          message: `${result.validRows} lançamento(s) importado(s) de ${file.name}.`,
        })
      }
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Falha na importação',
        message: getErrorMessage(err, 'Não foi possível processar o arquivo.'),
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação em lote — Realizado"
        description="Baixe o arquivo modelo (Excel), preencha uma linha por lançamento e envie CSV ou XLSX."
        actions={
          <>
            <button type="button" className="btn-toolbar-secondary" onClick={() => downloadActualImportTemplate()}>
              <Download className="h-3.5 w-3.5" />
              Baixar modelo
            </button>
            <button type="button" className="btn-toolbar-secondary" onClick={() => nav('/realizado')}>
              Voltar
            </button>
          </>
        }
      />

      <div className="glass rounded-[var(--radius-lg)] p-5 text-sm text-[var(--color-text2)]">
        <p className="font-medium text-[var(--color-text)]">Formato do arquivo</p>
        <p className="mt-2 text-xs leading-relaxed">
          Cada linha precisa das colunas <span className="font-medium text-[var(--color-text)]">Código</span>,{' '}
          <span className="font-medium text-[var(--color-text)]">Data</span>,{' '}
          <span className="font-medium text-[var(--color-text)]">Descrição</span> e{' '}
          <span className="font-medium text-[var(--color-text)]">Valor</span>.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs">
          <li>
            <span className="font-medium text-[var(--color-text)]">Código</span>: código composto do planejamento
            (Grupo.Empresa.Classe.Categoria.CentroDeCusto[.Item]), igual ao código exibido no Realizado.
          </li>
          <li>
            <span className="font-medium text-[var(--color-text)]">Data</span>: competência no formato{' '}
            <span className="font-mono text-[var(--color-text)]">DD/MM/AAAA</span>.
          </li>
          <li>
            <span className="font-medium text-[var(--color-text)]">Valor</span>: use ponto ou vírgula decimal
            (ex.: <span className="font-mono">1500.50</span> ou <span className="font-mono">1500,50</span>).
          </li>
        </ul>
        <div className="mt-3 text-xs">
          <div className="mb-1 font-medium text-[var(--color-text)]">Colunas</div>
          <p className="font-mono text-[var(--color-accent)]/90">{ACTUAL_IMPORT_REQUIRED_COLUMNS.join(' · ')}</p>
        </div>
      </div>

      <FileUploadZone
        accept=".csv,.xlsx"
        hint={
          uploading
            ? 'Processando arquivo…'
            : 'Arraste o CSV/XLSX ou clique para selecionar. Se houver erros, um .txt será baixado automaticamente.'
        }
        onFiles={(files) => {
          void handleFiles(files)
        }}
      />

      {lastResult ? (
        <div className="glass rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 text-sm">
          <p className="font-medium text-[var(--color-text)]">Resultado</p>
          <p className="mt-2 text-xs text-[var(--color-text2)]">
            Total: {lastResult.totalRows} · Importados: {lastResult.validRows} · Erros: {lastResult.invalidRows}
          </p>

          {lastResult.invalidRows > 0 ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-rose-500/30 bg-rose-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-200">Detalhe dos erros</p>
                {lastResult.errorReportTxt && lastResult.errorReportFileName ? (
                  <button
                    type="button"
                    className="btn-toolbar-secondary"
                    onClick={() => downloadTextFile(lastResult.errorReportTxt!, lastResult.errorReportFileName!)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar .txt de erros
                  </button>
                ) : null}
              </div>
              {lastResult.errors.length > 0 ? (
                <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto text-xs leading-relaxed text-rose-100/95">
                  {lastResult.errors.map((error, index) => (
                    <li key={`${index}-${error}`} className="border-b border-rose-400/10 pb-1.5 last:border-0 last:pb-0">
                      {error}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-rose-100/90">
                  Houve erro, mas o detalhe não veio na resposta. Reinicie o servidor (`npm run dev`) e importe de novo.
                </p>
              )}
            </div>
          ) : null}

          {lastResult.validRows > 0 ? (
            <button type="button" className="btn-toolbar-primary mt-4" onClick={() => nav('/realizado')}>
              Ver realizado
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
