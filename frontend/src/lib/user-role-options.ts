import type { SelectOption } from '@/components/ui/Select'

export const USER_ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Administrador (acesso total)' },
  { value: 'operador', label: 'Operador (tudo exceto usuários e auditoria)' },
  { value: 'consulta', label: 'Consulta (somente visualização)' },
]
