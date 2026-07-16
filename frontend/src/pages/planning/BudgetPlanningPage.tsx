import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy } from 'lucide-react'
import {
  PageHeader,
  FilterBar,
  FilterField,
  Select,
  DataTable,
  ListPageIncluirButton,
  Drawer,
  GlobalFilterBar,
} from '@/components/ui'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'
import type { SelectOption } from '@/components/ui/Select'
import { budgetsService, type BudgetPlanningRow } from '@/services/modules/budgets.service'
import { getErrorMessage } from '@/services/api/errors'
import { mastersService } from '@/services/modules/masters.service'
import type { BudgetVersion, BudgetItem, Category, Company, CompanyGroup, CostCenter, LedgerClass } from '@/types/entities'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { resolvePlanningLineCodeFromMasters, planningRowCodesFromSelection, resolvePlanningRowSelection, type PlanningRowSelection } from '@/lib/codes/planning-line'
import { PlanningMasterFields } from '@/components/planning/PlanningMasterFields'
import { formatBRL } from '@/lib/formatters/currency'
import { formatMonthLabel, isAnnualPlanningPeriod, MONTH_SELECT_OPTIONS, PLANNING_PERIOD_SELECT_OPTIONS, splitAnnualToMonthlyAmounts } from '@/lib/formatters/month'
import { useGlobalFilters } from '@/context/global-filters-context'
import { useCanMutate } from '@/hooks/useCanMutate'

const EMPTY_SELECTION: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
  itemId: '',
}

function planningRowBaseKey(row: {
  month: number
  companyId?: string
  classId?: string
  categoryId?: string
  costCenterId?: string
  costCenterCode: string
}) {
  const costCenterKey = row.costCenterId ?? row.costCenterCode
  return `${row.month}|${row.companyId ?? ''}|${row.classId ?? ''}|${row.categoryId ?? ''}|${costCenterKey}`
}

function planningRowMatchKey(row: {
  month: number
  companyId?: string
  classId?: string
  categoryId?: string
  costCenterId?: string
  costCenterCode: string
  itemCode?: string
}) {
  return `${planningRowBaseKey(row)}|${row.itemCode ?? ''}`
}

function upsertPlanningRows(prev: BudgetPlanningRow[], incoming: BudgetPlanningRow[]): BudgetPlanningRow[] {
  const byKey = new Map(prev.map((row) => [planningRowMatchKey(row), row]))
  for (const row of incoming) {
    if (row.itemCode) {
      for (const [key, existing] of byKey.entries()) {
        if (!existing.itemCode && planningRowBaseKey(existing) === planningRowBaseKey(row)) {
          byKey.delete(key)
        }
      }
    }
    byKey.set(planningRowMatchKey(row), row)
  }
  return Array.from(byKey.values())
}

function isSavablePlanningRow(row: BudgetPlanningRow): boolean {
  return Boolean(row.itemId || row.itemCode)
}

function buildPlanningRow(
  base: Omit<BudgetPlanningRow, 'id' | 'month' | 'plannedAmount'>,
  month: number,
  plannedAmount: number,
  idSuffix: string,
): BudgetPlanningRow {
  return {
    ...base,
    id: `temp-${Date.now()}-${idSuffix}`,
    month,
    plannedAmount,
  }
}

export function BudgetPlanningPage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const canMutate = useCanMutate()
  const { yearIds, monthIds, effectiveCompanyIds, isLoadingOptions, selectedVersionId } = useGlobalFilters()
  const [searchParams] = useSearchParams()
  const versionIdFromUrl = searchParams.get('versionId')

  const [versions, setVersions] = useState<BudgetVersion[]>([])
  const [versionId, setVersionId] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([])
  const [rows, setRows] = useState<BudgetPlanningRow[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newRow, setNewRow] = useState<Partial<BudgetPlanningRow>>({ month: 1, plannedAmount: 0 })
  const [newPeriod, setNewPeriod] = useState<string>('1')
  const [newSelection, setNewSelection] = useState<PlanningRowSelection>(EMPTY_SELECTION)

  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<BudgetPlanningRow | null>(null)
  const [editSelection, setEditSelection] = useState<PlanningRowSelection>(EMPTY_SELECTION)
  const rowsRef = useRef<BudgetPlanningRow[]>([])
  const savingRef = useRef(false)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    void mastersService.listCompanies().then(setCompanies)
    void mastersService.listCompanyGroups().then(setCompanyGroups)
    void mastersService.listCostCenters().then(setCostCenters)
    void mastersService.listCategories().then(setCategories)
    void mastersService.listClasses().then(setClasses)
    void mastersService.listBudgetItems().then(setBudgetItems)
  }, [])

  useEffect(() => {
    if (isLoadingOptions) return
    void budgetsService.listVersions().then((r) => {
      const selectedCompanies = effectiveCompanyIds ? new Set(effectiveCompanyIds) : undefined
      const filtered = selectedCompanies ? r.items.filter((v) => selectedCompanies.has(v.companyId)) : r.items
      setVersions(filtered)
      const fromUrl = versionIdFromUrl && filtered.some((v) => v.id === versionIdFromUrl) ? versionIdFromUrl : null
      setVersionId((prev) => {
        if (selectedVersionId && filtered.some((v) => v.id === selectedVersionId)) {
          return selectedVersionId
        }
        if (fromUrl) return fromUrl
        return filtered.some((v) => v.id === prev) ? prev : (filtered[0]?.id ?? '')
      })
    })
  }, [effectiveCompanyIds, isLoadingOptions, versionIdFromUrl, selectedVersionId])

  useEffect(() => {
    if (!versionId) return
    const year = Number(yearIds[0] ?? '') || 2026
    let cancelled = false
    void budgetsService.getPlanningTable({ versionId, year }).then((r) => {
      if (!cancelled) setRows(r.rows)
    })
    return () => {
      cancelled = true
    }
  }, [versionId, yearIds])

  const versionOptions: SelectOption[] = useMemo(
    () => versions.map((v) => ({ value: v.id, label: `${v.label}` })),
    [versions],
  )
  const monthOptions = MONTH_SELECT_OPTIONS

  const allowedCompanyIds = useMemo(
    () => (effectiveCompanyIds ? new Set(effectiveCompanyIds) : undefined),
    [effectiveCompanyIds],
  )

  const activeMonthIds = useMemo(() => {
    if (!monthIds.length || monthIds.includes('all')) return undefined
    const months = monthIds.map((id) => Number(id)).filter((month) => month >= 1 && month <= 12)
    return months.length ? new Set(months) : undefined
  }, [monthIds])

  const visibleRows = useMemo(() => {
    let filtered = rows
    if (activeMonthIds) {
      filtered = filtered.filter((row) => activeMonthIds.has(row.month))
    }
    if (allowedCompanyIds) {
      filtered = filtered.filter((row) => !row.companyId || allowedCompanyIds.has(row.companyId))
    }
    return filtered
  }, [rows, activeMonthIds, allowedCompanyIds])

  const defaultPlanningPeriod = useMemo(() => {
    const selectedMonths = monthIds
      .filter((id) => id !== 'all')
      .map((id) => Number(id))
      .filter((month) => month >= 1 && month <= 12)
      .sort((a, b) => a - b)
    if (selectedMonths.length) return String(selectedMonths[0])
    return '1'
  }, [monthIds])

  const planningMasters = useMemo(
    () => ({ companies, companyGroups, costCenters, categories, classes, budgetItems }),
    [companies, companyGroups, costCenters, categories, classes, budgetItems],
  )

  const resolvePlanningLineCode = (row: BudgetPlanningRow) =>
    resolvePlanningLineCodeFromMasters(
      {
        companyId: row.companyId,
        classId: row.classId,
        categoryId: row.categoryId,
        costCenterId: row.costCenterId,
        costCenterCode: row.costCenterCode,
        categoryCode: row.categoryCode,
        itemId: row.itemId,
        itemCode: row.itemCode,
      },
      planningMasters,
      { requireItem: true },
    )

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])
  const groupNameById = useMemo(() => new Map(companyGroups.map((g) => [g.id, g.name])), [companyGroups])
  const ledgerClassById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const costCenterById = useMemo(() => new Map(costCenters.map((c) => [c.id, c])), [costCenters])
  const itemById = useMemo(() => new Map(budgetItems.map((i) => [i.id, i])), [budgetItems])

  const resolvePlanningHierarchy = useCallback(
    (row: BudgetPlanningRow) => {
      const selection = resolvePlanningRowSelection(
        {
          companyId: row.companyId,
          classId: row.classId,
          categoryId: row.categoryId,
          costCenterId: row.costCenterId,
          itemId: row.itemId,
          itemCode: row.itemCode,
          costCenterCode: row.costCenterCode,
          categoryCode: row.categoryCode,
        },
        planningMasters,
      )
      const company = selection.companyId ? companyById.get(selection.companyId) : undefined
      return {
        groupName: company ? (groupNameById.get(company.companyGroupId) ?? '—') : '—',
        companyName: company?.name ?? '—',
        className: selection.classId ? (ledgerClassById.get(selection.classId)?.name ?? '—') : '—',
        categoryName: selection.categoryId ? (categoryById.get(selection.categoryId)?.name ?? '—') : '—',
        costCenterName: selection.costCenterId ? (costCenterById.get(selection.costCenterId)?.name ?? '—') : '—',
        itemName: selection.itemId ? (itemById.get(selection.itemId)?.name ?? '—') : '—',
      }
    },
    [planningMasters, companyById, groupNameById, ledgerClassById, categoryById, costCenterById, itemById],
  )

  const openNewRowDrawer = () => {
    const defaultCompanyId =
      effectiveCompanyIds?.[0] ?? (companies.find((c) => c.active)?.id ?? '')
    setNewRow({ month: 1, plannedAmount: 0 })
    setNewPeriod(defaultPlanningPeriod)
    setNewSelection({ ...EMPTY_SELECTION, companyId: defaultCompanyId })
    setDrawerOpen(true)
  }

  const persistPlanningRows = useCallback(
    async (nextRows: BudgetPlanningRow[]): Promise<boolean> => {
      if (!versionId || savingRef.current) return false
      const savableRows = nextRows.filter(isSavablePlanningRow)
      if (!savableRows.length) {
        toast.push({
          variant: 'error',
          title: 'Item obrigatório',
          message: 'Cada linha de planejamento precisa de um item selecionado.',
        })
        return false
      }
      savingRef.current = true
      try {
        await budgetsService.saveDraft(
          versionId,
          nextRows.map((row) => {
            if (!isSavablePlanningRow(row)) {
              return row.id.startsWith('temp-') ? {} : { id: row.id }
            }
            return {
              id: row.id.startsWith('temp-') ? undefined : row.id,
              month: row.month,
              companyId: row.companyId,
              classId: row.classId,
              categoryId: row.categoryId,
              costCenterId: row.costCenterId,
              costCenterCode: row.costCenterCode,
              categoryCode: row.categoryCode,
              itemId: row.itemId,
              itemCode: row.itemCode,
              budgetItemId: row.itemId,
              plannedAmount: row.plannedAmount,
            }
          }),
        )
        const year = Number(yearIds[0] ?? '') || 2026
        const refreshed = await budgetsService.getPlanningTable({ versionId, year })
        setRows(refreshed.rows)
        return true
      } catch (err) {
        toast.push({
          variant: 'error',
          title: 'Erro ao salvar planejamento',
          message: getErrorMessage(err, 'Não foi possível gravar as linhas no servidor.'),
        })
        return false
      } finally {
        savingRef.current = false
      }
    },
    [versionId, yearIds, toast],
  )

  const commitPlanningRows = useCallback(
    async (
      nextRows: BudgetPlanningRow[],
      successToast?: { title: string; message?: string },
    ): Promise<boolean> => {
      const previousRows = rowsRef.current
      setRows(nextRows)
      const ok = await persistPlanningRows(nextRows)
      if (!ok) {
        setRows(previousRows)
        return false
      }
      if (successToast) {
        toast.push({ variant: 'success', title: successToast.title, message: successToast.message })
      }
      return true
    },
    [persistPlanningRows, toast],
  )

  const newPeriodIsAnnual = isAnnualPlanningPeriod(newPeriod)
  const newMonthlyPreview = useMemo(() => {
    if (!newPeriodIsAnnual || !newRow.plannedAmount) return null
    const amounts = splitAnnualToMonthlyAmounts(newRow.plannedAmount)
    const first = amounts[0] ?? 0
    const allEqual = amounts.every((amount) => amount === first)
    return allEqual ? formatBRL(first) : `${formatBRL(first)} a ${formatBRL(amounts[amounts.length - 1] ?? first)}`
  }, [newPeriodIsAnnual, newRow.plannedAmount])

  const handleCreatePlanningRow = () => {
    const resolved = planningRowCodesFromSelection(newSelection, planningMasters)
    if (!resolved) {
      toast.push({
        variant: 'error',
        title: 'Dados incompletos',
        message: 'Selecione empresa, classe, categoria, centro de custo e item.',
      })
      return
    }

    const base = {
      companyId: resolved.companyId,
      classId: resolved.classId,
      categoryId: resolved.categoryId,
      costCenterId: resolved.costCenterId,
      costCenterCode: resolved.costCenterCode,
      categoryCode: resolved.categoryCode,
      itemId: resolved.itemId,
      itemCode: resolved.itemCode,
    }

    const plannedTotal = newRow.plannedAmount || 0
    const isAnnual = newPeriodIsAnnual

    const created = isAnnual
      ? splitAnnualToMonthlyAmounts(plannedTotal).map((plannedAmount, index) =>
          buildPlanningRow(base, index + 1, plannedAmount, String(index + 1)),
        )
      : [buildPlanningRow(base, Number(newPeriod) || 1, plannedTotal, 'single')]

    setDrawerOpen(false)
    setNewRow({ month: 1, plannedAmount: 0 })
    setNewPeriod('1')
    setNewSelection(EMPTY_SELECTION)

    const nextRows = upsertPlanningRows(rowsRef.current, created)
    void commitPlanningRows(nextRows, {
      title: isAnnual ? 'Orçamento anual incluído' : 'Linha incluída',
      message: isAnnual
        ? `Valor rateado em 12 meses (${formatBRL(plannedTotal)} no total).`
        : 'Planejamento salvo com sucesso.',
    })
  }

  const saveDrawerEdit = () => {
    if (!editDraft) return
    const resolved = planningRowCodesFromSelection(editSelection, planningMasters)
    if (!resolved) {
      toast.push({
        variant: 'error',
        title: 'Dados incompletos',
        message: 'Selecione empresa, classe, categoria, centro de custo e item.',
      })
      return
    }
    const month = Math.min(12, Math.max(1, Math.round(editDraft.month)))
    const updatedRow: BudgetPlanningRow = {
      ...editDraft,
      month,
      companyId: resolved.companyId,
      classId: resolved.classId,
      categoryId: resolved.categoryId,
      costCenterId: resolved.costCenterId,
      costCenterCode: resolved.costCenterCode,
      categoryCode: resolved.categoryCode,
      itemId: resolved.itemId,
      itemCode: resolved.itemCode,
    }
    const rowIndex = rowsRef.current.findIndex((x) => x.id === editDraft.id)
    if (rowIndex === -1) {
      toast.push({
        variant: 'error',
        title: 'Linha não encontrada',
        message: 'Recarregue a grade e tente editar novamente.',
      })
      return
    }
    const nextRows = [...rowsRef.current]
    nextRows[rowIndex] = updatedRow
    void commitPlanningRows(nextRows, {
      title: 'Linha salva',
      message: 'Alterações aplicadas na grade.',
    }).then((ok) => {
      if (!ok) return
      setEditOpen(false)
      setEditDraft(null)
      setEditSelection(EMPTY_SELECTION)
    })
  }

  const handleDeleteRow = () => {
    if (!editDraft) return
    const nextRows = rowsRef.current.filter((x) => x.id !== editDraft.id)
    void commitPlanningRows(nextRows, { title: 'Registro excluído' }).then((ok) => {
      if (!ok) return
      setEditOpen(false)
      setEditDraft(null)
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento orçamentário"
        description={canMutate ? undefined : 'Visualização somente leitura.'}
        actions={
          canMutate ? (
            <>
              <button
                type="button"
                className="btn-toolbar-secondary w-full justify-center sm:w-auto sm:shrink-0"
                onClick={async () => {
                  const y = Number(yearIds[0] ?? '') || new Date().getFullYear()
                  const nid = await budgetsService.duplicate(versionId, `v${y}.${Date.now()}`)
                  toast.push({ variant: 'info', title: 'Versão duplicada', message: `Novo id: ${nid.newVersionId}` })
                }}
              >
                <Copy className="h-3.5 w-3.5 shrink-0" />
                Duplicar
              </button>
              <ListPageIncluirButton
                contextLabel="Grade mensal do planejamento"
                onClick={openNewRowDrawer}
              />
            </>
          ) : undefined
        }
      />

      <FilterBar>
        <GlobalFilterBar embedded />
        <FilterField label="Versão">
          <Select size="sm" value={versionId} onChange={setVersionId} options={versionOptions} />
        </FilterField>
      </FilterBar>

      <div>
        <DataTable<BudgetPlanningRow>
              stickyHeader
              rows={visibleRows.map((r) => ({ ...r, id: r.id }))}
              columns={[
                {
                  id: 'line_code',
                  header: 'Código',
                  width: '220px',
                  cell: (r) => (
                    <span
                      className="font-mono text-[11px] text-[var(--color-text)]"
                      title={resolvePlanningLineCode(r)}
                    >
                      {resolvePlanningLineCode(r)}
                    </span>
                  ),
                },
                {
                  id: 'm',
                  header: 'Mês',
                  width: '100px',
                  cell: (r) => {
                    return (
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text)]">
                        {String(r.month).padStart(2, '0')} — {formatMonthLabel(r.month)}
                      </span>
                    )
                  },
                },
                {
                  id: 'group',
                  header: 'Grupo de empresas',
                  width: '160px',
                  cell: (r) => {
                    const { groupName } = resolvePlanningHierarchy(r)
                    return (
                      <span className="text-xs text-[var(--color-text2)]" title={groupName}>
                        {groupName}
                      </span>
                    )
                  },
                },
                {
                  id: 'company',
                  header: 'Empresa',
                  width: '160px',
                  cell: (r) => {
                    const { companyName } = resolvePlanningHierarchy(r)
                    return (
                      <span className="text-xs text-[var(--color-text2)]" title={companyName}>
                        {companyName}
                      </span>
                    )
                  },
                },
                {
                  id: 'class',
                  header: 'Classe',
                  width: '160px',
                  cell: (r) => {
                    const { className } = resolvePlanningHierarchy(r)
                    return (
                      <span className="text-xs text-[var(--color-text2)]" title={className}>
                        {className}
                      </span>
                    )
                  },
                },
                {
                  id: 'category',
                  header: 'Categoria',
                  width: '160px',
                  cell: (r) => {
                    const { categoryName } = resolvePlanningHierarchy(r)
                    return (
                      <span className="text-xs text-[var(--color-text2)]" title={categoryName}>
                        {categoryName}
                      </span>
                    )
                  },
                },
                {
                  id: 'cc',
                  header: 'Centro de custo',
                  width: '160px',
                  cell: (r) => {
                    const { costCenterName } = resolvePlanningHierarchy(r)
                    return (
                      <span className="min-w-0 truncate text-xs text-[var(--color-text2)]" title={costCenterName}>
                        {costCenterName}
                      </span>
                    )
                  },
                },
                {
                  id: 'item',
                  header: 'Item',
                  width: '160px',
                  cell: (r) => {
                    const { itemName } = resolvePlanningHierarchy(r)
                    return (
                      <span className="min-w-0 truncate text-xs text-[var(--color-text2)]" title={itemName}>
                        {itemName}
                      </span>
                    )
                  },
                },
                {
                  id: 'val',
                  header: 'Valor planejado',
                  width: '140px',
                  cell: (r) => {
                    return (
                      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--color-text)]">{formatBRL(r.plannedAmount)}</span>
                    )
                  },
                },
                ...(canMutate
                  ? [
                      {
                        id: 'act',
                        header: 'Ações',
                        width: '96px',
                        cell: (r: BudgetPlanningRow) => (
                          <button
                            type="button"
                            className="btn-table-ghost shrink-0 whitespace-nowrap"
                            onClick={() => {
                              const draft = structuredClone(r)
                              setEditDraft(draft)
                              setEditSelection(
                                resolvePlanningRowSelection(
                                  {
                                    companyId: draft.companyId,
                                    classId: draft.classId,
                                    categoryId: draft.categoryId,
                                    costCenterId: draft.costCenterId,
                                    costCenterCode: draft.costCenterCode,
                                    categoryCode: draft.categoryCode,
                                    itemId: draft.itemId,
                                    itemCode: draft.itemCode,
                                  },
                                  planningMasters,
                                ),
                              )
                              setEditOpen(true)
                            }}
                          >
                            Editar
                          </button>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
      </div>

      <Drawer
        open={drawerOpen}
        title="Nova linha de planejamento"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-toolbar-primary" onClick={handleCreatePlanningRow}>
              Salvar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label mb-1">Período</label>
            <Select
              value={newPeriod}
              onChange={(v) => setNewPeriod(String(v))}
              options={PLANNING_PERIOD_SELECT_OPTIONS}
            />
          </div>
          <PlanningMasterFields
            selection={newSelection}
            onSelectionChange={setNewSelection}
            companies={companies}
            classes={classes}
            categories={categories}
            costCenters={costCenters}
            budgetItems={budgetItems}
            allowedCompanyIds={allowedCompanyIds}
          />
          <div>
            <label className="label mb-1">{newPeriodIsAnnual ? 'Valor anual' : 'Valor planejado (mês)'}</label>
            <CurrencyInput
              value={newRow.plannedAmount!}
              onChange={(v) => setNewRow({ ...newRow, plannedAmount: v })}
            />
            {newPeriodIsAnnual && newMonthlyPreview ? (
              <p className="mt-1.5 text-xs text-[var(--color-text2)]">
                Rateio automático: {newMonthlyPreview} por mês (12 parcelas).
              </p>
            ) : null}
          </div>
        </div>
      </Drawer>

      <Drawer
        open={editOpen}
        title="Editar linha"
        onClose={() => {
          setEditOpen(false)
          setEditDraft(null)
          setEditSelection(EMPTY_SELECTION)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-toolbar-secondary"
              onClick={() => {
                setEditOpen(false)
                setEditDraft(null)
                setEditSelection(EMPTY_SELECTION)
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-toolbar-secondary"
              onClick={async () => {
                if (!editDraft) return
                const ok = await confirm({
                  title: 'Excluir linha',
                  description: 'Confirma a exclusão desta linha do planejamento?',
                  confirmText: 'Excluir',
                })
                if (!ok) return
                handleDeleteRow()
              }}
              disabled={!editDraft}
            >
              Excluir
            </button>
            <button type="button" className="btn-toolbar-primary" onClick={saveDrawerEdit} disabled={!editDraft}>
              Salvar
            </button>
          </div>
        }
      >
        {!editDraft ? null : (
          <div className="space-y-4">
            <div>
              <label className="label mb-1">Mês</label>
              <Select
                value={String(editDraft.month)}
                onChange={(v) => setEditDraft({ ...editDraft, month: Number(v) || 1 })}
                options={monthOptions}
              />
            </div>
            <PlanningMasterFields
              selection={editSelection}
              onSelectionChange={setEditSelection}
              companies={companies}
              classes={classes}
              categories={categories}
              costCenters={costCenters}
              budgetItems={budgetItems}
              allowedCompanyIds={allowedCompanyIds}
            />
            <div>
              <label className="label mb-1">Valor planejado</label>
              <CurrencyInput
                value={editDraft.plannedAmount}
                onChange={(n) => setEditDraft({ ...editDraft, plannedAmount: n })}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
