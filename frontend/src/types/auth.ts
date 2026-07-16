import type { UserRole, UserAccessScope } from './entities'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  /** epoch ms */
  expiresAt: number
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  allowResumo?: boolean
  access?: UserAccessScope
}

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}
