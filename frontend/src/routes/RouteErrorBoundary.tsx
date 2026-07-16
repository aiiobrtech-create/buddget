import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export function RouteErrorBoundary() {
  const error = useRouteError()
  let title = 'Algo deu errado'
  let message = 'Ocorreu um erro inesperado. Tente novamente ou volte ao início.'

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Página não encontrada'
      message = 'Esta rota não existe ou foi removida.'
    } else {
      title = `Erro ${error.status}`
      message = error.statusText || message
    }
    if (typeof error.data === 'string' && error.data) {
      message = error.data
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="glass glass-hover section-shell flex max-w-md flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--color-text2)]">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-toolbar-primary">
            Ir ao dashboard
          </Link>
          <button type="button" className="btn-toolbar-secondary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </div>
      </div>
    </div>
  )
}
