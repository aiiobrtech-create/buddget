import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PageHeader,
  DataTable,
  ListPageIncluirButton,
  FilterBar,
  FilterField,
  SearchInput,
} from '@/components/ui'
import { PlanningMasterFields } from '@/components/planning/PlanningMasterFields'
import { RegistryFormDrawer, LedgerNatureCell } from '@/pages/cadastros/registry'
import { loadRegistryRows, runRegistrySave } from '@/pages/cadastros/registry-api'
import { mastersService } from '@/services/modules/masters.service'
import type { BudgetItem, Category, Company, CompanyGroup, CostCenter, LedgerClass } from '@/types/entities'
import {
  nextBudgetItemCode,
  normalizeBudgetItemCode,
  sanitizeBudgetItemCodeInput,
} from '@/lib/codes/sequential'
import {
  resolvePlanningLineCodeFromMasters,
  resolvePlanningRowSelection,
  type PlanningLineMasters,
  type PlanningRowSelection,
} from '@/lib/codes/planning-line'
import { useToast } from '@/context/toast-context'

const textInputClass = () =>
  'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg3)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]'

const EMPTY_HIERARCHY: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
}

function RegistryEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn-table-ghost shrink-0 whitespace-nowrap" onClick={onClick}>
      Editar
    </button>
  )
}

function useItemEditDrawer<T extends { id: string }>() {
  const [editOpen, setEditOpen] = useState(false)
  const [editBuffer, setEditBuffer] = useState<T | null>(null)
  return {
    editOpen,
    edit: { editBuffer, setEditBuffer },
    closeEditDrawer: () => {
      setEditOpen(false)
      setEditBuffer(null)
    },
    openEditDrawer: (row: T) => {
      setEditBuffer(structuredClone(row))
      setEditOpen(true)
    },
  }
}

function nextBudgetItemCodeForCostCenter(existing: BudgetItem[], costCenterId: string): string {
  return nextBudgetItemCode(existing.filter((item) => item.costCenterId === costCenterId))
}

export function BudgetItemsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<BudgetItem[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newHierarchy, setNewHierarchy] = useState<PlanningRowSelection>(EMPTY_HIERARCHY)
  const [newEntry, setNewEntry] = useState({ code: '', name: '' })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useItemEditDrawer<BudgetItem>()

  const reload = () => {
    loadRegistryRows(toast, () => mastersService.listCompanyGroups(), setGroups)
    loadRegistryRows(toast, () => mastersService.listCompanies(), setCompanies)
    loadRegistryRows(toast, () => mastersService.listClasses(), setClasses)
    loadRegistryRows(toast, () => mastersService.listCategories(), setCategories)
    loadRegistryRows(toast, () => mastersService.listCostCenters(), setCostCenters)
    loadRegistryRows(toast, () => mastersService.listBudgetItems(), setRows)
  }

  useEffect(() => {
    reload()
  }, [])

  const planningMasters = useMemo<PlanningLineMasters>(
    () => ({ companies, companyGroups: groups, costCenters, categories, classes, budgetItems: rows }),
    [companies, groups, costCenters, categories, classes, rows],
  )

  const resolveItemCompositeCode = useCallback(
    (item: BudgetItem) => {
      const costCenter = costCenters.find((cc) => cc.id === item.costCenterId)
      const category = costCenter ? categories.find((cat) => cat.id === costCenter.categoryId) : undefined
      return resolvePlanningLineCodeFromMasters(
        {
          companyId: item.companyId,
          costCenterId: item.costCenterId,
          itemId: item.id,
          itemCode: item.code,
          categoryId: costCenter?.categoryId,
          classId: category?.classId,
        },
        planningMasters,
      )
    },
    [planningMasters, costCenters, categories],
  )

  const costCenterById = useMemo(() => new Map(costCenters.map((cc) => [cc.id, cc])), [costCenters])
  const categoryById = useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories])
  const ledgerClassById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups])

  const resolveItemHierarchy = useCallback(
    (item: BudgetItem) => {
      const costCenter = costCenterById.get(item.costCenterId)
      const category = costCenter ? categoryById.get(costCenter.categoryId) : undefined
      const ledgerClass = category ? ledgerClassById.get(category.classId) : undefined
      const companyId = item.companyId ?? costCenter?.companyId ?? ledgerClass?.companyId
      const company = companyId ? companyById.get(companyId) : undefined
      return { costCenter, category, ledgerClass, company }
    },
    [costCenterById, categoryById, ledgerClassById, companyById],
  )

  const resolveGroupName = useCallback(
    (item: BudgetItem) => {
      const { company } = resolveItemHierarchy(item)
      if (!company) return '—'
      return groupNameById.get(company.companyGroupId) ?? '—'
    },
    [resolveItemHierarchy, groupNameById],
  )

  const resolveCompanyName = useCallback(
    (item: BudgetItem) => resolveItemHierarchy(item).company?.name ?? '—',
    [resolveItemHierarchy],
  )

  const resolveClassName = useCallback(
    (item: BudgetItem) => resolveItemHierarchy(item).ledgerClass?.name ?? '—',
    [resolveItemHierarchy],
  )

  const resolveCategoryName = useCallback(
    (item: BudgetItem) => resolveItemHierarchy(item).category?.name ?? '—',
    [resolveItemHierarchy],
  )

  const resolveCostCenterName = useCallback(
    (item: BudgetItem) => resolveItemHierarchy(item).costCenter?.name ?? '—',
    [resolveItemHierarchy],
  )

  const resolveNature = useCallback(
    (item: BudgetItem) => resolveItemHierarchy(item).ledgerClass?.nature,
    [resolveItemHierarchy],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((item) => {
      const composite = resolveItemCompositeCode(item).toLowerCase()
      const name = item.name.toLowerCase()
      const code = item.code.toLowerCase()
      const group = resolveGroupName(item).toLowerCase()
      const company = resolveCompanyName(item).toLowerCase()
      const ledgerClass = resolveClassName(item).toLowerCase()
      const category = resolveCategoryName(item).toLowerCase()
      const costCenter = resolveCostCenterName(item).toLowerCase()
      const nature = (resolveNature(item) ?? '').toLowerCase()
      return (
        composite.includes(q) ||
        name.includes(q) ||
        code.includes(q) ||
        group.includes(q) ||
        company.includes(q) ||
        ledgerClass.includes(q) ||
        category.includes(q) ||
        costCenter.includes(q) ||
        nature.includes(q)
      )
    })
  }, [
    rows,
    search,
    resolveItemCompositeCode,
    resolveGroupName,
    resolveCompanyName,
    resolveClassName,
    resolveCategoryName,
    resolveCostCenterName,
    resolveNature,
  ])

  const save = async () => {
    if (!edit.editBuffer) return
    const code = normalizeBudgetItemCode(edit.editBuffer.code)
    const name = edit.editBuffer.name.trim()
    if (!code || !name || !edit.editBuffer.costCenterId || !edit.editBuffer.companyId) {
      toast.push({
        variant: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha empresa, classe, categoria, centro de custo, código e nome.',
      })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateBudgetItem(edit.editBuffer!.id, {
          code,
          name,
          costCenterId: edit.editBuffer!.costCenterId,
          companyId: edit.editBuffer!.companyId,
        })
        closeEditDrawer()
        reload()
      },
      'Item atualizado',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.deleteBudgetItem(edit.editBuffer!.id)
        closeEditDrawer()
        reload()
      },
      'Item excluído',
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itens de orçamento"
        description="Grupo → Empresa → Classe → Categoria → Centro de custo → Item"
        actions={<ListPageIncluirButton contextLabel="Itens de orçamento" onClick={() => setDrawerOpen(true)} />}
      />

      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nome, grupo, empresa, classe, categoria ou centro de custo…"
          />
        </FilterField>
      </FilterBar>

      <DataTable<BudgetItem>
        rows={filtered}
        columns={[
          {
            id: 'code',
            header: 'Código',
            width: '240px',
            cell: (r) => {
              const composite = resolveItemCompositeCode(r)
              return (
                <span className="font-mono text-xs text-[var(--color-text)]" title={composite}>
                  {composite}
                </span>
              )
            },
          },
          {
            id: 'group',
            header: 'Grupo de empresas',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={resolveGroupName(r)}>
                {resolveGroupName(r)}
              </span>
            ),
          },
          {
            id: 'company',
            header: 'Empresa',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={resolveCompanyName(r)}>
                {resolveCompanyName(r)}
              </span>
            ),
          },
          {
            id: 'class',
            header: 'Classe',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={resolveClassName(r)}>
                {resolveClassName(r)}
              </span>
            ),
          },
          {
            id: 'cat',
            header: 'Categoria',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={resolveCategoryName(r)}>
                {resolveCategoryName(r)}
              </span>
            ),
          },
          {
            id: 'cc',
            header: 'Centro de custo',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={resolveCostCenterName(r)}>
                {resolveCostCenterName(r)}
              </span>
            ),
          },
          {
            id: 'name',
            header: 'Nome',
            cell: (r) => (
              <span className="text-[var(--color-text)]" title={r.name}>
                {r.name}
              </span>
            ),
          },
          {
            id: 'nat',
            header: 'Natureza',
            width: '160px',
            cell: (r) => <LedgerNatureCell nature={resolveNature(r)} />,
          },
          {
            id: 'act',
            header: 'Ações',
            width: '132px',
            cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
          },
        ]}
      />

      <RegistryFormDrawer
        open={drawerOpen}
        title="Novo item de orçamento"
        onClose={() => setDrawerOpen(false)}
        onSave={async () => {
          const code = normalizeBudgetItemCode(newEntry.code ?? '')
          if (!code || !newEntry.name?.trim() || !newHierarchy.companyId || !newHierarchy.costCenterId) {
            toast.push({
              variant: 'error',
              title: 'Campos obrigatórios',
              message: 'Preencha empresa, classe, categoria, centro de custo, código e nome.',
            })
            return
          }
          await runRegistrySave(
            toast,
            async () => {
              await mastersService.createBudgetItem({
                code,
                name: newEntry.name.trim(),
                costCenterId: newHierarchy.costCenterId,
                companyId: newHierarchy.companyId,
                active: true,
              })
              setDrawerOpen(false)
              setNewHierarchy(EMPTY_HIERARCHY)
              setNewEntry({ code: '', name: '' })
              reload()
            },
            'Item incluído',
          )
        }}
      >
        <PlanningMasterFields
          selection={newHierarchy}
          onSelectionChange={(sel) => {
            setNewHierarchy(sel)
            if (sel.costCenterId) {
              setNewEntry((prev) => ({
                ...prev,
                code: nextBudgetItemCodeForCostCenter(rows, sel.costCenterId),
              }))
            } else {
              setNewEntry((prev) => ({ ...prev, code: '' }))
            }
          }}
          companies={companies}
          classes={classes}
          categories={categories}
          costCenters={costCenters}
          hideItem
        />
        <div>
          <label className="label mb-1">Código do item</label>
          <input
            className={textInputClass()}
            value={newEntry.code}
            onChange={(e) => setNewEntry({ ...newEntry, code: sanitizeBudgetItemCodeInput(e.target.value) })}
            placeholder="Ex.: 1"
            maxLength={6}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label mb-1">Nome do item</label>
          <input
            className={textInputClass()}
            value={newEntry.name}
            onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
          />
        </div>
      </RegistryFormDrawer>

      <RegistryFormDrawer
        open={editOpen}
        title="Editar item de orçamento"
        onClose={closeEditDrawer}
        onSave={save}
        onDelete={handleDelete}
      >
        {edit.editBuffer ? (
          <>
            <PlanningMasterFields
              selection={resolvePlanningRowSelection(
                {
                  companyId: edit.editBuffer.companyId,
                  costCenterId: edit.editBuffer.costCenterId,
                  itemId: edit.editBuffer.id,
                  categoryId: costCenters.find((cc) => cc.id === edit.editBuffer!.costCenterId)?.categoryId,
                  classId: categories.find(
                    (cat) => cat.id === costCenters.find((cc) => cc.id === edit.editBuffer!.costCenterId)?.categoryId,
                  )?.classId,
                },
                planningMasters,
              )}
              onSelectionChange={(sel) => {
                edit.setEditBuffer((prev) => {
                  if (!prev) return prev
                  const costCenterChanged = sel.costCenterId !== prev.costCenterId
                  return {
                    ...prev,
                    companyId: sel.companyId,
                    costCenterId: sel.costCenterId,
                    ...(costCenterChanged && sel.costCenterId
                      ? {
                          code: nextBudgetItemCodeForCostCenter(
                            rows.filter((row) => row.id !== prev.id),
                            sel.costCenterId,
                          ),
                        }
                      : {}),
                  }
                })
              }}
              companies={companies}
              classes={classes}
              categories={categories}
              costCenters={costCenters}
              hideItem
            />
            <div>
              <label className="label mb-1">Código do item</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.code}
                onChange={(e) =>
                  edit.setEditBuffer({ ...edit.editBuffer!, code: sanitizeBudgetItemCodeInput(e.target.value) })
                }
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label mb-1">Nome do item</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.name}
                onChange={(e) => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </RegistryFormDrawer>
    </div>
  )
}
