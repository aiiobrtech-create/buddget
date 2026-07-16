const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Alteração',
  delete: 'Exclusão',
}

/** Exibe ação de auditoria em português (pt-BR) — apenas CRUD. */
export function formatAuditActionLabel(action: string): string {
  const verb = action.toLowerCase().split('_')[0] ?? action.toLowerCase()
  return ACTION_LABELS[verb] ?? action
}

export const AUDIT_CRUD_ACTIONS = new Set(['create', 'update', 'delete'])
