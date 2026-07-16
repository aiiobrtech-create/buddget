import { useCallback, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FileUploadZone({
  accept,
  onFiles,
  hint = 'Arraste arquivos ou clique para selecionar. O upload final é tratado pelo backend (Storage assinado).',
}: {
  accept?: string
  onFiles: (files: FileList | null) => void
  hint?: string
}) {
  const [drag, setDrag] = useState(false)

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDrag(false)
      onFiles(e.dataTransfer.files)
    },
    [onFiles],
  )

  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed p-10 text-center transition',
        drag ? 'border-[var(--color-border-strong)] bg-[var(--color-brand)]/5' : 'border-[var(--color-border)] bg-[var(--color-bg3)]/30',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        <UploadCloud className="h-6 w-6" />
      </div>
      <div className="text-sm font-semibold text-[var(--color-text)]">Importar planilha</div>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-[var(--color-text2)]">{hint}</p>
    </label>
  )
}
