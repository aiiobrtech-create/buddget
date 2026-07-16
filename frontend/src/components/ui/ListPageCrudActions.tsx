import type { ReactNode } from 'react'
import { PencilLine, Plus } from 'lucide-react'
import { useToast } from '@/context/toast-context'

export function ListPageIncluirButton({
  contextLabel,
  label = 'Incluir',
  toastTitle = 'Inclusão',
  message,
  onClick,
}: {
  contextLabel: string
  label?: ReactNode
  toastTitle?: string
  message?: string
  onClick?: () => void
}) {
  const toast = useToast()
  const body =
    message ??
    `Em breve você poderá criar registros novos em «${contextLabel}». Enquanto isso, use as rotinas já liberadas no sistema ou fale com o administrador.`
  return (
    <button
      type="button"
      className="btn-toolbar-primary inline-flex items-center justify-center gap-1.5"
      onClick={onClick ? onClick : () => toast.push({ variant: 'info', title: toastTitle, message: body })}
    >
      <Plus className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      {label}
    </button>
  )
}

export function ListPageEditarButton({
  contextLabel,
  itemLabel,
  toastTitle = 'Edição',
  message,
}: {
  contextLabel: string
  itemLabel: string
  toastTitle?: string
  message?: string
}) {
  const toast = useToast()
  const body =
    message ??
    `Os detalhes de «${itemLabel}» em ${contextLabel} poderão ser alterados por aqui em uma próxima versão. Se a tabela tiver campo editável, use a coluna correspondente.`
  return (
    <button
      type="button"
      className="btn-table-ghost inline-flex items-center gap-1"
      onClick={() => toast.push({ variant: 'info', title: toastTitle, message: body })}
    >
      <PencilLine className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      Editar
    </button>
  )
}
