import { userSession } from '@/lib/session'
import { tokenStorage } from '@/services/api/token-storage'

export const SESSION_INVALID_EVENT = 'buddget:session-invalid'

export function isMockOrInvalidAccessToken(token: string | null): boolean {
  if (!token) return true
  if (token === 'mock-access' || token.startsWith('mock-')) return true
  const parts = token.split('.')
  return parts.length !== 3
}

export function invalidateClientSession() {
  tokenStorage.clear()
  userSession.clear()
  window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT))
}
