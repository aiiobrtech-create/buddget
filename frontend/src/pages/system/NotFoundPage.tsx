import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="glass glass-hover section-shell flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/20">
        <FileQuestion className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--color-text)]">Página não encontrada</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text2)]">
        O endereço não corresponde a nenhuma tela do sistema. Verifique o link ou use o menu lateral.
      </p>
      <Link to="/" className="btn-toolbar-primary mt-6">
        Voltar ao dashboard
      </Link>
    </div>
  )
}
