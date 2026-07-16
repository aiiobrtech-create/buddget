import type { AuthTokens } from '@/types'

const ACCESS = 'buddget_access_token'
const REFRESH = 'buddget_refresh_token'
const EXP = 'buddget_access_exp'

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS)
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH)
  },
  getExpiresAt(): number | null {
    const v = localStorage.getItem(EXP)
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  },
  setTokens(t: AuthTokens) {
    localStorage.setItem(ACCESS, t.accessToken)
    localStorage.setItem(REFRESH, t.refreshToken)
    localStorage.setItem(EXP, String(t.expiresAt))
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem(EXP)
  },
}
