import type { ApiErrorBody } from '@/types'

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  password: 'Senha',
  role: 'Papel',
  active: 'Status',
}

function formatValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null

  const flattened = details as {
    fieldErrors?: Record<string, string[]>
    formErrors?: string[]
  }

  const parts: string[] = []
  if (flattened.formErrors?.length) {
    parts.push(...flattened.formErrors)
  }

  if (flattened.fieldErrors) {
    for (const [field, errors] of Object.entries(flattened.fieldErrors)) {
      if (!errors?.length) continue
      const label = FIELD_LABELS[field] ?? field
      parts.push(`${label}: ${errors.join(', ')}`)
    }
  }

  return parts.length ? parts.join(' · ') : null
}

export class ApiHttpError extends Error {
  readonly status: number
  readonly body?: ApiErrorBody

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

export function getErrorMessage(err: unknown, fallback = 'Erro inesperado'): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 404) {
      return err.body?.message ?? 'Endpoint não encontrado na API. Reinicie o servidor (npm run dev:app) e tente de novo.'
    }
    const validation = formatValidationDetails(err.body?.details)
    if (validation) return validation
    return err.body?.message ?? err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}
