import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="glass glass-hover section-shell flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--color-text)]">Acesso restrito</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text2)]">
        Seu perfil não possui permissão para esta área. Solicite ajuste ao administrador do sistema.
      </p>
      <Link to="/" className="btn-toolbar-primary mt-6">
        Voltar ao dashboard
      </Link>
    </div>
  )
}
