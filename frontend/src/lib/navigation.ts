import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  FolderKanban,
  Network,
  GitCompare,
  ClipboardList,
  LayoutDashboard,
  LibraryBig,
  Package,
  Table2,
  Wallet,
  Users,
} from 'lucide-react'
import type { UserRole } from '@/types/entities'
import { canAccessPath } from '@/modules/auth/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavSectionDef {
  title: string
  items: NavItem[]
}

export const navSections: NavSectionDef[] = [
  {
    title: 'Inteligência',
    items: [
      { to: '/', label: 'Dashboard executivo', icon: LayoutDashboard },
      { to: '/comparativo', label: 'Orçado × Realizado', icon: GitCompare },
      { to: '/resumo', label: 'Resumo', icon: ClipboardList },
    ],
  },
  {
    title: 'Operação orçamentária',
    items: [
      { to: '/orcamentos', label: 'Orçamentos', icon: FolderKanban },
      { to: '/planejamento', label: 'Planejamento', icon: Table2 },
      { to: '/realizado', label: 'Realizado', icon: Wallet },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/cadastros/grupos-de-empresas', label: 'Grupos de empresas', icon: Network },
      { to: '/cadastros/empresas', label: 'Empresas', icon: Building2 },
      { to: '/cadastros/classes', label: 'Classes', icon: LibraryBig },
      { to: '/cadastros/categorias', label: 'Categorias', icon: LibraryBig },
      { to: '/cadastros/centros-de-custo', label: 'Centros de custo', icon: LibraryBig },
      { to: '/itens', label: 'Itens', icon: Package },
    ],
  },
  {
    title: 'Administração',
    items: [
      { to: '/admin/usuarios', label: 'Gestão de usuários', icon: Users },
      { to: '/admin/auditoria', label: 'Auditoria', icon: LibraryBig },
    ],
  },
]

export function filterNavForRole(role: UserRole, allowResumo?: boolean): NavSectionDef[] {
  return navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((it) => canAccessPath(it.to, role, allowResumo)),
    }))
    .filter((s) => s.items.length > 0)
}
