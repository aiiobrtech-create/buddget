import type { UserRole } from '@/types/entities'

const roleRank: Record<UserRole, number> = {
  consulta: 1,
  operador: 2,
  admin: 3,
}

function rk(role: UserRole) {
  return roleRank[role] ?? 0
}

function isCadastrosPath(pathname: string) {
  return pathname.startsWith('/cadastros') || pathname.startsWith('/itens')
}

function isOperadorBlockedAdminPath(pathname: string) {
  return pathname.startsWith('/admin/usuarios') || pathname.startsWith('/admin/auditoria')
}

/** Papéis que podem criar, editar ou excluir dados operacionais. */
export function canMutateData(role: UserRole): boolean {
  return role !== 'consulta'
}

/** Regras apenas de UX — autorização real é no backend. */
export function canAccessPath(pathname: string, role: UserRole, allowResumo?: boolean): boolean {
  if (pathname.startsWith('/resumo') && allowResumo === false) {
    return false
  }

  if (role === 'admin') return true

  if (role === 'operador') {
    return !isOperadorBlockedAdminPath(pathname)
  }

  if (pathname.startsWith('/admin')) return false
  if (isCadastrosPath(pathname)) return false
  if (pathname.startsWith('/realizado/importacao')) return false

  if (role === 'consulta') {
    if (pathname.startsWith('/orcamentos')) return true
    if (pathname.startsWith('/planejamento')) return true
    if (pathname.startsWith('/realizado')) return true
    if (pathname.startsWith('/comparativo')) return true
    if (pathname.startsWith('/resumo')) return true
    if (pathname.startsWith('/relatorios')) return true
    if (pathname.startsWith('/forecast')) return true
    return pathname === '/'
  }

  return rk(role) > 0
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  consulta: 'Consulta',
}

export function roleOptionDescription(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Acesso total'
    case 'operador':
      return 'Acesso total, exceto gestão de usuários e auditoria'
    case 'consulta':
      return 'Somente visualização, com escopo configurável por cadastro'
    default:
      return ''
  }
}
