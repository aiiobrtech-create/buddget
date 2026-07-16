import { useMemo } from 'react'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'
import type { BudgetItem, Category, Company, CostCenter, LedgerClass } from '@/types/entities'
import type { PlanningRowSelection } from '@/lib/codes/planning-line'

export function PlanningMasterFields({
  selection,
  onSelectionChange,
  companies,
  classes,
  categories,
  costCenters,
  budgetItems = [],
  allowedCompanyIds,
  hideCostCenter = false,
  hideCategory = false,
  hideClass = false,
  hideItem = false,
}: {
  selection: PlanningRowSelection
  onSelectionChange: (next: PlanningRowSelection) => void
  companies: Company[]
  classes: LedgerClass[]
  categories: Category[]
  costCenters: CostCenter[]
  budgetItems?: BudgetItem[]
  allowedCompanyIds?: Set<string>
  hideCostCenter?: boolean
  hideCategory?: boolean
  hideClass?: boolean
  hideItem?: boolean
}) {
  const companyOptions: SelectOption[] = useMemo(() => {
    return companies
      .filter((c) => c.active && (!allowedCompanyIds || allowedCompanyIds.has(c.id)))
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [companies, allowedCompanyIds])

  const classOptions: SelectOption[] = useMemo(() => {
    return classes
      .filter((c) => !selection.companyId || !c.companyId || c.companyId === selection.companyId)
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [classes, selection.companyId])

  const categoryOptions: SelectOption[] = useMemo(() => {
    if (!selection.classId) return []
    return categories
      .filter((c) => c.active && c.classId === selection.classId)
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [categories, selection.classId])

  const costCenterOptions: SelectOption[] = useMemo(() => {
    if (!selection.categoryId) return []
    return costCenters
      .filter(
        (c) =>
          c.active &&
          c.categoryId === selection.categoryId &&
          (!selection.companyId || !c.companyId || c.companyId === selection.companyId),
      )
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [costCenters, selection.categoryId, selection.companyId])

  const itemOptions: SelectOption[] = useMemo(() => {
    if (!selection.costCenterId) return []
    return budgetItems
      .filter((item) => item.active && item.costCenterId === selection.costCenterId)
      .map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))
  }, [budgetItems, selection.costCenterId])

  const itemSelectDisabled = !selection.costCenterId
  const itemPlaceholder =
    selection.costCenterId && itemOptions.length === 0
      ? 'Nenhum item cadastrado neste centro de custo'
      : 'Selecionar item'

  return (
    <>
      <div>
        <label className="label mb-1">Empresa</label>
        <Select
          value={selection.companyId}
          onChange={(v) =>
            onSelectionChange(
              hideClass
                ? { ...selection, companyId: String(v) }
                : { companyId: String(v), classId: '', categoryId: '', costCenterId: '', itemId: '' },
            )
          }
          options={companyOptions}
          placeholder="Selecionar empresa"
        />
      </div>
      {hideClass ? null : (
      <div>
        <label className="label mb-1">Classe</label>
        <Select
          value={selection.classId}
          onChange={(v) =>
            onSelectionChange({ ...selection, classId: String(v), categoryId: '', costCenterId: '', itemId: '' })
          }
          options={classOptions}
          placeholder="Selecionar classe"
          disabled={!selection.companyId}
        />
      </div>
      )}
      {hideCategory ? null : (
      <div>
        <label className="label mb-1">Categoria</label>
        <Select
          value={selection.categoryId}
          onChange={(v) => onSelectionChange({ ...selection, categoryId: String(v), costCenterId: '', itemId: '' })}
          options={categoryOptions}
          placeholder="Selecionar categoria"
          disabled={!selection.classId}
        />
      </div>
      )}
      {hideCostCenter ? null : (
      <div>
        <label className="label mb-1">Centro de custo</label>
        <Select
          value={selection.costCenterId}
          onChange={(v) => {
            const costCenterId = String(v)
            const itemsForCenter = budgetItems.filter(
              (item) => item.active && item.costCenterId === costCenterId,
            )
            onSelectionChange({
              ...selection,
              costCenterId,
              itemId: itemsForCenter.length === 1 ? itemsForCenter[0]!.id : '',
            })
          }}
          options={costCenterOptions}
          placeholder="Selecionar centro de custo"
          disabled={!selection.categoryId}
        />
      </div>
      )}
      {hideItem ? null : (
      <div>
        <label className="label mb-1">Item</label>
        <Select
          value={selection.itemId ?? ''}
          onChange={(v) => onSelectionChange({ ...selection, itemId: String(v) })}
          options={itemOptions}
          placeholder={itemPlaceholder}
          disabled={itemSelectDisabled || itemOptions.length === 0}
        />
        {selection.costCenterId && itemOptions.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--color-text2)]">
            Cadastre um item em Cadastros → Itens para este centro de custo.
          </p>
        ) : null}
      </div>
      )}
    </>
  )
}
