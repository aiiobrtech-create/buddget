import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Segmentos compactos alinhados a `.btn-toolbar-*` / tabelas. */
const segment =
  'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-none border-0 bg-transparent px-2.5 py-1.5 text-[11px] font-medium normal-case tracking-normal text-[var(--color-accent)] shadow-none transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)]'

function Divider() {
  return <div className="w-px shrink-0 self-stretch bg-[var(--color-border)]" aria-hidden />
}

export function ExportSplitGroup({
  onExcel,
  onPdf,
  onCsv,
  className,
}: {
  onExcel: () => void
  onPdf: () => void
  /** Quando informado, exibe segmento CSV à esquerda (ex.: Relatórios). */
  onCsv?: () => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Exportar"
      className={cn(
        'inline-flex min-w-0 max-w-full overflow-hidden rounded-md border border-[var(--color-border)]/80 bg-[var(--color-bg3)]/50 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]',
        className,
      )}
    >
      {onCsv ? (
        <>
          <button type="button" className={segment} onClick={onCsv}>
            <FileDown className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            CSV
          </button>
          <Divider />
        </>
      ) : null}
      <button type="button" className={segment} onClick={onExcel}>
        <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        Excel
      </button>
      <Divider />
      <button type="button" className={segment} onClick={onPdf}>
        <FileText className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        PDF
      </button>
    </div>
  )
}
