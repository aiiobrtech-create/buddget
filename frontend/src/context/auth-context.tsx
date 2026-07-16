import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '@/types'
import { authService, type LoginInput } from '@/services/modules/auth.service'
import { tokenStorage } from '@/services/api/token-storage'
import { userSession } from '@/lib/session'
import { normalizeUserAccess } from '@/lib/user-access'
import { isMockOrInvalidAccessToken, SESSION_INVALID_EVENT } from '@/lib/session-invalidation'
import { apiGetData } from '@/services/api/client'
import { env } from '@/lib/env'

interface AuthContextValue {
  user: AuthUser | null
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitialUser(): AuthUser | null {
  const u = userSession.get()
  const t = tokenStorage.getAccess()
  const refresh = tokenStorage.getRefresh()

  if (!u || !t || !refresh || isMockOrInvalidAccessToken(t) || refresh.startsWith('mock-')) {
    tokenStorage.clear()
    userSession.clear()
    return null
  }

  return normalizeAuthUser(u)
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (!user.access) return user
  return { ...user, access: normalizeUserAccess(user.access) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readInitialUser())

  useEffect(() => {
    const onInvalid = () => setUser(null)
    window.addEventListener(SESSION_INVALID_EVENT, onInvalid)
    return () => window.removeEventListener(SESSION_INVALID_EVENT, onInvalid)
  }, [])

  useEffect(() => {
    const initialUser = readInitialUser()
    if (!initialUser || env.useMockApi) return

    let active = true
    void apiGetData<AuthUser>('/me')
      .then((updatedUser) => {
        if (active && updatedUser) {
          const normalized = normalizeAuthUser(updatedUser)
          userSession.set(normalized)
          setUser(normalized)
        }
      })
      .catch(() => {
        // Ignora falhas temporárias
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const res = await authService.login(input)
    const normalized = normalizeAuthUser(res.user)
    userSession.set(normalized)
    setUser(normalized)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    userSession.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
