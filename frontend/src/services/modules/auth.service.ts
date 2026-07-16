import { env } from '@/lib/env'
import { ApiHttpError } from '@/services/api/errors'
import { apiPostData } from '@/services/api/client'
import { tokenStorage } from '@/services/api/token-storage'
import { mockDelay } from '@/mocks/delay'
import { mockLoginResponse } from '@/mocks/fixtures'
import type { LoginResponse } from '@/types/auth'

export interface LoginInput {
  email: string
  password: string
}

export const authService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    if (!input.email?.trim()) {
      throw new ApiHttpError('Informe o e-mail.', 400, { code: 'validation', message: 'Informe o e-mail.' })
    }
    if (env.useMockApi) {
      await mockDelay(400)
      if (input.password.length < 4) {
        throw new ApiHttpError('Credenciais inválidas.', 401, {
          code: 'unauthorized',
          message: 'Credenciais inválidas.',
        })
      }
      const mockRole =
        input.email.includes('admin')
          ? 'admin'
          : input.email.includes('operador')
            ? 'operador'
            : input.email.includes('consulta')
              ? 'consulta'
              : 'consulta'
      const res = mockLoginResponse(mockRole)
      tokenStorage.setTokens(res.tokens)
      return res
    }

    const data = await apiPostData<LoginResponse>(
      '/auth/login',
      { email: input.email.trim().toLowerCase(), password: input.password },
      undefined,
    )
    tokenStorage.setTokens(data.tokens)
    return data
  },

  async logout(): Promise<void> {
    const refresh = tokenStorage.getRefresh()
    if (!env.useMockApi && refresh) {
      try {
        await apiPostData<{ ok: boolean }>('/auth/logout', { refreshToken: refresh })
      } catch {
        /* noop */
      }
    }
    tokenStorage.clear()
  },

  async forgotPassword(email: string): Promise<{ ok: true }> {
    if (env.useMockApi) {
      await mockDelay(500)
      return { ok: true }
    }
    return apiPostData('/auth/forgot-password', { email })
  },
}
