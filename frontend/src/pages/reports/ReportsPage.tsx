import { useEffect, useMemo, useState } from 'react'
import { TableProperties } from 'lucide-react'
import {
  PageHeader,
  FilterBar,
  FilterField,
  Select,
  Tabs,
  TabList,
  TabTrigger,
  TabPanel,
  DataTable,
  ExportSplitGroup,
  Skeleton,
  GlobalFilterBar,
} from '@/components/ui'
import { printTableExport } from '@/lib/print-export'
import { reportsService } from '@/services/modules/reports.service'
import { useToast } from '@/context/toast-context'
import { useGlobalFilters } from '@/context/global-filters-context'
import * as XLSX from 'xlsx'

export function ReportsPage() {
  const toast = useToast()
  const { effectiveCompanyIds, classIds, ccIds, categoryIds, yearIds, monthIds } = useGlobalFilters()
  const [defs, setDefs] = useState<{ key: string; title: string; description?: string }[]>([])
  const [reportKey, setReportKey] = useState('exec_summary')
  const [periodKey, setPeriodKey] = useState('ytd')

  useEffect(() => {
    void reportsService.listDefinitions().then(setDefs)
  }, [])

  const options = useMemo(() => defs.map((d) => ({ value: d.key, label: d.title })), [defs])

  const previewRows = useMemo(
    () => [
      { id: '1', kpi: 'Orçamento', v: 48_250_000 },
      { id: '2', kpi: 'Realizado', v: 41_180_500 },
      { id: '3', kpi: 'Forecast', v: 46_100_000 },
    ],
    [],
  )

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(previewRows.map((r) => ({ KPI: r.kpi, Valor: r.v })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo')
    XLSX.writeFile(wb, `buddget-${reportKey}.csv`, { bookType: 'csv' })
  }

  const exportXlsx = async () => {
    const asset = await reportsService.exportReport({
      kind: 'xlsx',
      reportKey,
      filters: {
        periodKey,
        yearIds,
        monthIds,
        companyIds: effectiveCompanyIds,
        classIds,
        ccIds,
        categoryIds,
      },
    })
    if ('signedUrl' in asset) {
      toast.push({ variant: 'info', title: 'URL assinada (mock)', message: asset.signedUrl })
    }
    const ws = XLSX.utils.json_to_sheet(previewRows.map((r) => ({ KPI: r.kpi, Valor: r.v })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo')
    XLSX.writeFile(wb, `buddget-${reportKey}.xlsx`)
  }

  const exportPdf = () => {
    const title = defs.find((d) => d.key === reportKey)?.title ?? reportKey
    printTableExport({
      documentTitle: `BUDDGET · ${reportKey}`,
      heading: 'Relatórios analíticos',
      subtitleLines: [
        `Relatório: ${title}`,
        `Período: ${periodKey.toUpperCase()}`,
        `Exportado em ${new Date().toLocaleString('pt-BR')}`,
      ],
      columns: [
        { header: 'Indicador', align: 'left' },
        { header: 'Valor (BRL)', align: 'right' },
      ],
      rows: previewRows.map((r) => ({
        cells: [r.kpi, r.v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      })),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios analíticos"
        description="Filtros server-side, exportação e impressão amigável. Dados sensíveis sempre validados na API."
        actions={
          <ExportSplitGroup onCsv={exportCsv} onExcel={() => void exportXlsx()} onPdf={exportPdf} />
        }
      />

      <FilterBar>
        <GlobalFilterBar embedded />
        <FilterField label="Relatório" className="max-w-[14rem]">
          <Select
            size="sm"
            value={reportKey}
            onChange={setReportKey}
            options={options.length ? options : [{ value: 'exec_summary', label: 'Resumo executivo' }]}
          />
        </FilterField>
        <FilterField label="Período">
          <Select
            size="sm"
            value={periodKey}
            onChange={setPeriodKey}
            options={[
              { value: 'ytd', label: 'YTD' },
              { value: 'q2', label: 'Q2/26' },
            ]}
          />
        </FilterField>
      </FilterBar>

      <Tabs defaultValue="resumido">
        <TabList>
          <TabTrigger value="resumido">Visão resumida</TabTrigger>
          <TabTrigger value="detalhe">Visão detalhada</TabTrigger>
        </TabList>
        <TabPanel value="resumido">
          <DataTable
            rows={previewRows}
            columns={[
              { id: 'k', header: 'Indicador', cell: (r) => r.kpi },
              {
                id: 'v',
                header: 'Valor (BRL)',
                cell: (r) => <span className="font-mono text-xs font-semibold">{r.v.toLocaleString('pt-BR')}</span>,
              },
            ]}
          />
        </TabPanel>
        <TabPanel value="detalhe">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg3)]/30 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
            <div className="border-b border-[var(--color-border)] px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)]/12 text-[var(--color-accent)] ring-1 ring-[var(--color-border)]">
                    <TableProperties className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">Visão detalhada</h3>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--color-text2)]">
                      Grade paginada pelo servidor, ordenação por coluna e filtros alinhados ao relatório e ao período selecionados acima.
                    </p>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end" aria-label="Recursos previstos">
                  {['Paginação API', 'Sort por coluna', 'Filtros persistidos'].map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text2)]"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="table-shell scrollbar-thin">
              <table className="table-data" style={{ minWidth: 'max(100%, 720px)' }}>
                <thead>
                  <tr>
                    {['Conta / dimensão', 'Período', 'Orçado', 'Realizado', 'Variação', 'Status'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['a', 'b', 'c', 'd', 'e'].map((id) => (
                    <tr key={id}>
                      <td>
                        <Skeleton className="h-4 w-[min(100%,220px)]" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td>
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td>
                        <Skeleton className="h-5 w-[4.5rem] rounded-full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-[11px] text-[var(--color-muted)] md:px-6">
              <span>Pré-visualização — dados reais após integração do endpoint de detalhe.</span>
              <span className="hidden font-mono sm:inline">página 1 · …</span>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}
