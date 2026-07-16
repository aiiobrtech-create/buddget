import { env } from '@/lib/env'
import type { ApiResponse } from '@/types'
import { isApiError } from '@/types'
import { ApiHttpError } from './errors'
import { invalidateClientSession } from '@/lib/session-invalidation'
import { isRetryableStatus, retryDelayMs, sleep } from './retry'
import { tokenStorage } from './token-storage'

const MAX_RETRIES = 3

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** pula interceptor de refresh em chamadas de auth */
  skipRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

function isPublicAuthPath(path: string) {
  return path.startsWith('/auth/')
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return false
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        })
        if (!res.ok) return false
        const json = (await res.json()) as ApiResponse<{
          accessToken: string
          refreshToken: string
          expiresAt: number
        }>
        if (isApiError(json) || !json.data) return false
        tokenStorage.setTokens({
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
          expiresAt: json.data.expiresAt,
        })
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const segment = path.startsWith('/') ? path : `/${path}`
  const target = `${base}${segment}`

  const u = /^https?:\/\//i.test(target)
    ? new URL(target)
    : new URL(target, typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:4072')

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue
      u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: { code: 'invalid_json', message: text.slice(0, 200) || 'Resposta inválida' } }
  }
}

function normalizeEnvelope<T>(raw: unknown): ApiResponse<T> {
  if (raw && typeof raw === 'object' && 'error' in raw && raw.error) {
    return raw as ApiResponse<T>
  }
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw as ApiResponse<T>
  }
  return { data: raw as T }
}

async function rawRequest(
  path: string,
  opts: RequestOptions & { query?: Record<string, string | number | boolean | undefined> },
): Promise<Response> {
  const access = isPublicAuthPath(path) ? null : tokenStorage.getAccess()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...opts.headers,
  }
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (access) headers.Authorization = `Bearer ${access}`

  const url = buildUrl(path, opts.query)

  return fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body:
      opts.body === undefined || opts.body instanceof FormData
        ? (opts.body as BodyInit | undefined)
        : JSON.stringify(opts.body),
    signal: opts.signal,
  })
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions & { query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<ApiResponse<T>> {
  let lastRes: Response | null = null
  const skipRefresh = opts.skipRefresh ?? isPublicAuthPath(path)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res = await rawRequest(path, opts)
    lastRes = res

    if (res.status === 401 && !skipRefresh) {
      const ok = await tryRefresh()
      if (ok) {
        res = await rawRequest(path, opts)
        lastRes = res
      } else {
        invalidateClientSession()
      }
    }

    if (res.status === 401 && !skipRefresh) {
      throw new ApiHttpError('Sessão expirada. Faça login novamente.', 401, {
        code: 'unauthorized',
        message: 'Sessão expirada. Faça login novamente.',
      })
    }

    if (isRetryableStatus(res.status) && attempt < MAX_RETRIES - 1) {
      await sleep(retryDelayMs(attempt))
      continue
    }

    const parsed = await parseJson(res)
    const envelope = normalizeEnvelope<T>(parsed)

    if (!res.ok) {
      if (isApiError(envelope)) {
        throw new ApiHttpError(envelope.error.message, res.status, envelope.error)
      }
      throw new ApiHttpError(res.statusText || 'Erro HTTP', res.status)
    }

    if (isApiError(envelope)) {
      throw new ApiHttpError(envelope.error.message, res.status, envelope.error)
    }

    return envelope
  }

  throw new ApiHttpError(lastRes?.statusText || 'Erro HTTP', lastRes?.status ?? 502)
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),

  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'POST', body, signal }),

  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'PUT', body, signal }),

  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'PATCH', body, signal }),

  delete: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { method: 'DELETE', signal }),
}

/** Retorna apenas `data` após validar envelope de sucesso. */
export async function apiGetData<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const r = await apiRequest<T>(path, { method: 'GET', query, signal })
  if (r.data === undefined || r.data === null) {
    throw new ApiHttpError('Resposta sem dados.', 500, { code: 'invalid_body', message: 'Resposta sem dados.' })
  }
  return r.data
}

export async function apiPostData<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const r = await apiRequest<T>(path, { method: 'POST', body, signal })
  if (r.data === undefined || r.data === null) {
    throw new ApiHttpError('Resposta sem dados.', 500, { code: 'invalid_body', message: 'Resposta sem dados.' })
  }
  return r.data
}

export async function apiPatchData<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const r = await apiRequest<T>(path, { method: 'PATCH', body, signal })
  if (r.data === undefined || r.data === null) {
    throw new ApiHttpError('Resposta sem dados.', 500, { code: 'invalid_body', message: 'Resposta sem dados.' })
  }
  return r.data
}

export async function apiDeleteData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await apiRequest<T>(path, { method: 'DELETE', signal })
  if (r.data === undefined || r.data === null) {
    throw new ApiHttpError('Resposta sem dados.', 500, { code: 'invalid_body', message: 'Resposta sem dados.' })
  }
  return r.data
}
