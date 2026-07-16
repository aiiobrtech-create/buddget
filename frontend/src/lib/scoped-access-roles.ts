import type { UserRole } from '@/types/entities'

/** Papéis que podem ter escopo hierárquico de cadastros (operador e consulta). */
export function roleHasScopedAccess(role: UserRole): boolean {
  return role === 'operador' || role === 'consulta'
}
