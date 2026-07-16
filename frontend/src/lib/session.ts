import type { AuthUser } from '@/types'
import { normalizeUserAccess } from '@/lib/user-access'

const USER_KEY = 'buddget_user'

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (!user.access) return user
  return { ...user, access: normalizeUserAccess(user.access) }
}

export const userSession = {
  get(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY)
      if (!raw) return null
      return normalizeAuthUser(JSON.parse(raw) as AuthUser)
    } catch {
      return null
    }
  },
  set(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeAuthUser(user)))
  },
  clear() {
    localStorage.removeItem(USER_KEY)
  },
}
