import { MultiSelect } from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'
import type { UserAccessScope, UserRole } from '@/types/entities'
import { normalizeUserAccess } from '@/lib/user-access'

function accessCopy(role: UserRole) {
  if (role === 'consulta') {
    return {
      title: 'Escopo de visualização',
      description:
        'Defina os cadastros que este usuário pode consultar: grupo de empresas, empresas, classes, categorias, centros de custo e itens.',
    }
  }
  return {
    title: 'Acessos do operador',
    description:
      'Defina os cadastros que este operador pode acessar ao lançar movimentos (realizado).',
  }
}

export function UserAccessFields({
  role = 'operador',
  value,
  onChange,
  companyGroupOptions,
  companyOptions,
  classOptions,
  categoryOptions,
  costCenterOptions,
  budgetItemOptions,
}: {
  role?: UserRole
  value: UserAccessScope
  onChange: (value: UserAccessScope) => void
  companyGroupOptions: SelectOption[]
  companyOptions: SelectOption[]
  classOptions: SelectOption[]
  categoryOptions: SelectOption[]
  costCenterOptions: SelectOption[]
  budgetItemOptions: SelectOption[]
}) {
  const copy = accessCopy(role)
  const access = normalizeUserAccess(value)

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)]/80 bg-[var(--color-bg)]/30 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">{copy.title}</div>
        <p className="mt-1 text-[11px] text-[var(--color-text2)]">{copy.description}</p>
      </div>
      <div>
        <label className="label mb-1">Grupos de empresas</label>
        <MultiSelect
          values={access.companyGroupIds}
          onChange={(companyGroupIds) => onChange({ ...access, companyGroupIds })}
          options={companyGroupOptions}
          placeholder="Selecionar grupos…"
        />
      </div>
      <div>
        <label className="label mb-1">Empresas</label>
        <MultiSelect
          values={access.companyIds}
          onChange={(companyIds) => onChange({ ...access, companyIds })}
          options={companyOptions}
          placeholder="Selecionar empresas…"
        />
      </div>
      <div>
        <label className="label mb-1">Classes</label>
        <MultiSelect
          values={access.classIds}
          onChange={(classIds) => onChange({ ...access, classIds })}
          options={classOptions}
          placeholder="Selecionar classes…"
        />
      </div>
      <div>
        <label className="label mb-1">Categorias</label>
        <MultiSelect
          values={access.categoryIds}
          onChange={(categoryIds) => onChange({ ...access, categoryIds })}
          options={categoryOptions}
          placeholder="Selecionar categorias…"
        />
      </div>
      <div>
        <label className="label mb-1">Centros de custo</label>
        <MultiSelect
          values={access.costCenterIds}
          onChange={(costCenterIds) => onChange({ ...access, costCenterIds })}
          options={costCenterOptions}
          placeholder="Selecionar centros de custo…"
        />
      </div>
      <div>
        <label className="label mb-1">Itens</label>
        <MultiSelect
          values={access.budgetItemIds}
          onChange={(budgetItemIds) => onChange({ ...access, budgetItemIds })}
          options={budgetItemOptions}
          placeholder="Selecionar itens…"
        />
      </div>
    </div>
  )
}
