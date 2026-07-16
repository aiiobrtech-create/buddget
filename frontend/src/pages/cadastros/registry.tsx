import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadRegistryRows, runRegistryDelete, runRegistrySave } from '@/pages/cadastros/registry-api'
import {
  PageHeader,
  DataTable,
  ListPageIncluirButton,
  Select,
  ActiveBoolSelect,
  Drawer,
  FilterBar,
  FilterField,
  SearchInput,
} from '@/components/ui'

export function RegistryFormDrawer({
  open,
  onClose,
  title,
  onSave,
  onDelete,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  onSave: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  children: React.ReactNode
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (saving) return
    setSaving(true)
    void Promise.resolve(onSave()).finally(() => setSaving(false))
  }

  const handleDelete = () => {
    if (saving || !onDelete) return
    setSaving(true)
    void Promise.resolve(onDelete()).finally(() => setSaving(false))
  }

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-toolbar-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          {onDelete ? (
            <button type="button" className="btn-toolbar-secondary" onClick={handleDelete} disabled={saving}>
              Excluir
            </button>
          ) : null}
          <button type="button" className="btn-toolbar-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">{children}</div>
    </Drawer>
  )
}

function RegistryEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn-table-ghost shrink-0 whitespace-nowrap" onClick={onClick}>
      Editar
    </button>
  )
}

function useRegistryEditDrawer<T extends { id: string }>() {
  const [editOpen, setEditOpen] = useState(false)
  const edit = useInlineRowEdit<T>()

  const closeEditDrawer = () => {
    setEditOpen(false)
    edit.cancelEdit()
  }

  const openEditDrawer = (row: T) => {
    edit.startEdit(row)
    setEditOpen(true)
  }

  return { editOpen, edit, closeEditDrawer, openEditDrawer }
}

import { mastersService } from '@/services/modules/masters.service'
import type {
  Category,
  Company,
  CompanyGroup,
  CostCenter,
  LedgerClass,
  Project,
  RoleProfile,
  UserAccount,
  UserRole,
} from '@/types/entities'
import { displayCnpj, formatCnpj } from '@/lib/formatters/cnpj'
import { formatDatePt } from '@/lib/formatters/date'
import {
  isCategoryCodeTaken,
  nextCategoryCodeForClass,
  nextClassCode,
  nextCostCenterCode,
  nextTwoDigitCode,
  normalizeCategoryCode,
  normalizeClassCode,
  normalizeCostCenterCode,
  sanitizeCategoryCodeInput,
  sanitizeClassCodeInput,
  sanitizeCostCenterCodeInput,
} from '@/lib/codes/sequential'
import { useToast } from '@/context/toast-context'
import { useInlineRowEdit } from '@/hooks/useInlineRowEdit'
import { USER_ROLE_OPTIONS } from '@/lib/user-role-options'
import type { SelectOption } from '@/components/ui/Select'
import { PlanningMasterFields } from '@/components/planning/PlanningMasterFields'
import {
  resolvePlanningRowSelection,
  resolvePlanningLineCodeFromMasters,
  buildCompanyCompositeCode,
  buildLedgerClassCompositeCode,
  buildCategoryCompositeCode,
  type PlanningLineMasters,
  type PlanningRowSelection,
} from '@/lib/codes/planning-line'

function shell(
  title: string,
  description: string,
  children: ReactNode,
  actions?: ReactNode,
) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  )
}

function textInputClass() {
  return 'input w-full min-w-[8rem] text-sm'
}

function ledgerNatureBadgeClass(nature?: string) {
  const key = (nature ?? '').toLowerCase()
  if (key === 'receita') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
  if (key === 'despesa') return 'border-red-500/40 bg-red-500/15 text-red-400'
  if (key === 'ativo') return 'border-amber-500/40 bg-amber-500/15 text-amber-400'
  return ''
}

export function LedgerNatureCell({ nature }: { nature?: string }) {
  return <span className={`badge ${ledgerNatureBadgeClass(nature)}`.trim()}>{nature ?? '—'}</span>
}

function nextCompanyCode(existing: Company[], companyGroupId: string): string {
  return nextTwoDigitCode(existing.filter((c) => c.companyGroupId === companyGroupId))
}

function nextCostCenterCodeForCategory(existing: CostCenter[], categoryId: string): string {
  return nextCostCenterCode(existing.filter((c) => c.categoryId === categoryId))
}

export function CompanyGroupsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CompanyGroup[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({ code: '', name: '', description: '', active: true })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<CompanyGroup>()

  const reload = () => void mastersService.listCompanyGroups().then(setRows)

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const code = (r.code ?? '').toLowerCase()
      const name = (r.name ?? '').toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }, [rows, search])

  const save = async () => {
    if (!edit.editBuffer) return
    const name = edit.editBuffer.name.trim()
    if (!name) {
      toast.push({ variant: 'error', title: 'Nome é obrigatório' })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateCompanyGroup(edit.editBuffer!.id, {
          name,
          description: edit.editBuffer!.description?.trim() || undefined,
          active: edit.editBuffer!.active,
        })
        closeEditDrawer()
        reload()
      },
      'Grupo atualizado',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.deleteCompanyGroup(edit.editBuffer!.id)
        closeEditDrawer()
        reload()
      },
      'Registro excluído',
    )
  }

  return shell(
    'Grupos de empresas',
    'Agrupamento corporativo usado como referência na criação de orçamentos.',
    <>
      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código ou nome…"
          />
        </FilterField>
      </FilterBar>
      <DataTable<CompanyGroup>
        rows={filtered}
        columns={[
          {
            id: 'c',
            header: 'Código',
            width: '120px',
            cell: (r) => (
              <span className="font-mono text-xs text-[var(--color-text)]" title={r.code}>
                {r.code}
              </span>
            ),
          },
          {
            id: 'n',
            header: 'Nome',
            cell: (r) => (
              <span className="text-[var(--color-text)]" title={r.name}>
                {r.name}
              </span>
            ),
          },
          {
            id: 'd',
            header: 'Descrição',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]" title={r.description ?? undefined}>
                {r.description ?? '—'}
              </span>
            ),
          },
          {
            id: 'cr',
            header: 'Criado em',
            cell: (r) => <span className="font-mono text-xs text-[var(--color-text2)]">{formatDatePt(r.createdAt)}</span>,
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
        onClose={() => setDrawerOpen(false)}
        title="Novo grupo de empresas"
        onSave={async () => {
          if (!newEntry.name.trim()) {
            toast.push({ variant: 'error', title: 'Nome é obrigatório' })
            return
          }
          await runRegistrySave(
            toast,
            async () => {
              await mastersService.createCompanyGroup({
                code: nextTwoDigitCode(rows),
                name: newEntry.name.trim(),
                description: newEntry.description.trim() || undefined,
                active: newEntry.active !== false,
              })
              setDrawerOpen(false)
              setNewEntry({ code: '', name: '', description: '', active: true })
              reload()
            },
            'Grupo incluído',
          )
        }}
      >
        <div>
          <label className="label mb-1">Código</label>
          <input className={textInputClass()} value={newEntry.code} readOnly disabled />
        </div>
        <div>
          <label className="label mb-1">Nome</label>
          <input
            className={textInputClass()}
            value={newEntry.name}
            onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label mb-1">Descrição</label>
          <input
            className={textInputClass()}
            value={newEntry.description}
            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label mb-1">Status</label>
          <ActiveBoolSelect
            value={newEntry.active}
            onChange={(v) => setNewEntry({ ...newEntry, active: v })}
            activeLabel="Ativo"
            inactiveLabel="Inativo"
          />
        </div>
      </RegistryFormDrawer>

      <RegistryFormDrawer open={editOpen} title="Editar grupo" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
        {edit.editBuffer ? (
          <>
            <div>
              <label className="label mb-1">Código</label>
              <input className={textInputClass()} value={edit.editBuffer.code} readOnly disabled />
            </div>
            <div>
              <label className="label mb-1">Nome</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.name}
                onChange={(e) => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1">Descrição</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.description ?? ''}
                onChange={(e) =>
                  edit.setEditBuffer({ ...edit.editBuffer!, description: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <label className="label mb-1">Status</label>
              <ActiveBoolSelect
                value={edit.editBuffer.active}
                onChange={(v) => edit.setEditBuffer({ ...edit.editBuffer!, active: v })}
                activeLabel="Ativo"
                inactiveLabel="Inativo"
              />
            </div>
          </>
        ) : null}
      </RegistryFormDrawer>
    </>,
    <ListPageIncluirButton
      contextLabel="Grupos de empresas"
      onClick={() => {
        setNewEntry({ code: nextTwoDigitCode(rows), name: '', description: '', active: true })
        setDrawerOpen(true)
      }}
    />,
  )
}

export function CompaniesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<any>({ code: '', name: '', taxId: '', companyGroupId: '', active: true })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<Company>()
  const reloadCompanies = () => void mastersService.listCompanies().then(setRows)
  const reloadGroups = () => void mastersService.listCompanyGroups().then(setGroups)

  useEffect(() => {
    reloadCompanies()
    reloadGroups()
  }, [])

  const groupOpts: SelectOption[] = useMemo(
    () => groups.filter((g) => g.active).map((g) => ({ value: g.id, label: g.name })),
    [groups],
  )
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups])
  const groupCodeById = useMemo(() => new Map(groups.map((g) => [g.id, g.code])), [groups])

  const companyCompositeCode = useCallback(
    (company: Company) => {
      const groupCode = groupCodeById.get(company.companyGroupId)
      if (!groupCode) return company.code
      return buildCompanyCompositeCode(groupCode, company.code)
    },
    [groupCodeById],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    const qDigits = q.replace(/\D/g, '')
    return rows.filter((r) => {
      const code = (r.code ?? '').toLowerCase()
      const composite = companyCompositeCode(r).toLowerCase()
      const name = (r.name ?? '').toLowerCase()
      const tax = (r.taxId ?? '').toLowerCase()
      if (code.includes(q) || composite.includes(q) || name.includes(q) || tax.includes(q)) return true
      if (qDigits && (r.taxId ?? '').replace(/\D/g, '').includes(qDigits)) return true
      return false
    })
  }, [rows, search, companyCompositeCode])

  const openCreateDrawer = (companyGroupId?: string) => {
    const groupId = companyGroupId ?? groups[0]?.id ?? ''
    setNewEntry({
      code: groupId ? nextCompanyCode(rows, groupId) : '',
      name: '',
      taxId: '',
      companyGroupId: groupId,
      active: true,
    })
    setDrawerOpen(true)
  }

  const save = async () => {
    if (!edit.editBuffer) return
    const name = edit.editBuffer.name.trim()
    if (!name) {
      toast.push({ variant: 'error', title: 'Nome obrigatório' })
      return
    }
    if (!edit.editBuffer.companyGroupId) {
      toast.push({ variant: 'error', title: 'Grupo obrigatório' })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateCompany(edit.editBuffer!.id, {
          name,
          companyGroupId: edit.editBuffer!.companyGroupId,
          taxId: edit.editBuffer!.taxId,
          active: edit.editBuffer!.active,
        })
        closeEditDrawer()
        reloadCompanies()
      },
      'Empresa atualizada',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.deleteCompany(edit.editBuffer!.id)
        closeEditDrawer()
        reloadCompanies()
      },
      'Registro excluído',
    )
  }

  return shell(
    'Empresas',
    'Cadastro mestre corporativo com vínculo a centros de custo e consolidações.',
    <>
      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nome ou CNPJ…"
          />
        </FilterField>
      </FilterBar>
      <DataTable<Company>
      rows={filtered}
      columns={[
        {
          id: 'code',
          header: 'Código',
          width: '140px',
          cell: (r) => {
            const composite = companyCompositeCode(r)
            return (
              <span className="font-mono text-xs text-[var(--color-text)]" title={composite}>
                {composite}
              </span>
            )
          },
        },
        {
          id: 'g',
          header: 'Grupo',
          width: '160px',
          cell: (r) => (
            <span className="text-xs text-[var(--color-text2)]">
              {groupNameById.get(r.companyGroupId) ?? r.companyGroupId}
            </span>
          ),
        },
        {
          id: 'n',
          header: 'Nome',
          cell: (r) => (
            <span className="text-[var(--color-text)]" title={r.name}>
              {r.name}
            </span>
          ),
        },
        {
          id: 't',
          header: 'CNPJ',
          cell: (r) => (
            <span className="font-mono text-xs text-[var(--color-text)]" title={displayCnpj(r.taxId)}>
              {displayCnpj(r.taxId)}
            </span>
          ),
        },
        {
          id: 'c',
          header: 'Criada em',
          cell: (r) => <span className="font-mono text-xs text-[var(--color-text2)]">{formatDatePt(r.createdAt)}</span>,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
        },
      ]}
    />
      
<RegistryFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nova Empresa" onSave={async () => {
  if (!newEntry.name?.trim() || !newEntry.companyGroupId) {
    toast.push({ variant: 'error', title: 'Nome e grupo são obrigatórios' });
    return;
  }
  await runRegistrySave(toast, async () => {
    await mastersService.createCompany({
      companyGroupId: newEntry.companyGroupId,
      code: nextCompanyCode(rows, newEntry.companyGroupId),
      name: newEntry.name!.trim(),
      taxId: newEntry.taxId,
      active: newEntry.active !== false,
    });
    setDrawerOpen(false);
    setNewEntry({ code: '', name: '', taxId: '', companyGroupId: groups[0]?.id ?? '', active: true });
    reloadCompanies();
  }, 'Empresa incluída');
}}>
  <div><label className="label mb-1">Grupo de empresas</label><Select value={newEntry.companyGroupId} onChange={v => {
    const companyGroupId = String(v);
    setNewEntry({ ...newEntry, companyGroupId, code: companyGroupId ? nextCompanyCode(rows, companyGroupId) : '' });
  }} options={groupOpts} placeholder="Grupo" /></div>
  <div><label className="label mb-1">Código</label><input className={textInputClass()} value={newEntry.code} readOnly disabled /></div>
  <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
  <div><label className="label mb-1">CNPJ</label><input className={textInputClass()} value={formatCnpj(newEntry.taxId ?? '')} onChange={e => setNewEntry({ ...newEntry, taxId: formatCnpj(e.target.value) })} placeholder="00.000.000/0000-00" inputMode="numeric" autoComplete="off" maxLength={18} /></div>
  <div><label className="label mb-1">Status</label><ActiveBoolSelect value={newEntry.active} onChange={v => setNewEntry({ ...newEntry, active: v })} activeLabel="Ativa" inactiveLabel="Inativa" /></div>
</RegistryFormDrawer>

<RegistryFormDrawer
  open={editOpen}
  title="Editar empresa"
  onClose={closeEditDrawer}
  onSave={save}
  onDelete={handleDelete}
>
  {edit.editBuffer ? (
    <>
      <div><label className="label mb-1">Grupo de empresas</label><Select value={edit.editBuffer.companyGroupId} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, companyGroupId: String(v) })} options={groupOpts} placeholder="Grupo" /></div>
      <div><label className="label mb-1">Código</label><input className={textInputClass()} value={edit.editBuffer.code} readOnly disabled /></div>
      <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
      <div><label className="label mb-1">CNPJ</label><input className={textInputClass()} value={formatCnpj(edit.editBuffer.taxId ?? '')} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, taxId: formatCnpj(e.target.value) || undefined })} placeholder="00.000.000/0000-00" inputMode="numeric" autoComplete="off" maxLength={18} /></div>
      <div><label className="label mb-1">Status</label><ActiveBoolSelect value={edit.editBuffer.active} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, active: v })} activeLabel="Ativa" inactiveLabel="Inativa" /></div>
    </>
  ) : null}
</RegistryFormDrawer>

    </>,
    <ListPageIncluirButton contextLabel="Empresas" onClick={() => openCreateDrawer()} />,
  )
}

const EMPTY_CC_HIERARCHY: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
}

const EMPTY_LEDGER_HIERARCHY: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
}

const EMPTY_CATEGORY_HIERARCHY: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
}

export function CostCentersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CostCenter[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newHierarchy, setNewHierarchy] = useState<PlanningRowSelection>(EMPTY_CC_HIERARCHY)
  const [newEntry, setNewEntry] = useState({ code: '', name: '' })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<CostCenter>()
  const reload = () => {
    loadRegistryRows(toast, () => mastersService.listCompanyGroups(), setGroups)
    loadRegistryRows(toast, () => mastersService.listCompanies(), setCompanies)
    loadRegistryRows(toast, () => mastersService.listClasses(), setClasses)
    loadRegistryRows(toast, () => mastersService.listCategories(), setCategories)
    loadRegistryRows(toast, () => mastersService.listCostCenters(), setRows)
  }

  useEffect(() => {
    reload()
  }, [])

  const planningMasters = useMemo<PlanningLineMasters>(
    () => ({ companies, companyGroups: groups, costCenters: rows, categories, classes }),
    [companies, groups, rows, categories, classes],
  )

  const resolveCostCenterCompositeCode = useCallback(
    (costCenter: CostCenter) =>
      resolvePlanningLineCodeFromMasters(
        {
          companyId: costCenter.companyId,
          costCenterId: costCenter.id,
          costCenterCode: costCenter.code,
          categoryId: costCenter.categoryId,
        },
        planningMasters,
      ),
    [planningMasters],
  )

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])
  const categoryClassIdById = useMemo(() => new Map(categories.map((c) => [c.id, c.classId])), [categories])
  const ledgerNatureByClassId = useMemo(() => new Map(classes.map((c) => [c.id, c.nature])), [classes])
  const ledgerClassById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups])
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])

  const resolveCostCenterCompanyId = useCallback(
    (costCenter: CostCenter) => {
      if (costCenter.companyId) return costCenter.companyId
      const classId = categoryClassIdById.get(costCenter.categoryId)
      return classId ? ledgerClassById.get(classId)?.companyId : undefined
    },
    [categoryClassIdById, ledgerClassById],
  )

  const resolveGroupName = useCallback(
    (costCenter: CostCenter) => {
      const companyId = resolveCostCenterCompanyId(costCenter)
      const company = companyId ? companyById.get(companyId) : undefined
      if (!company) return '—'
      return groupNameById.get(company.companyGroupId) ?? '—'
    },
    [resolveCostCenterCompanyId, companyById, groupNameById],
  )

  const resolveCompanyName = useCallback(
    (costCenter: CostCenter) => {
      const companyId = resolveCostCenterCompanyId(costCenter)
      return companyId ? (companyById.get(companyId)?.name ?? '—') : '—'
    },
    [resolveCostCenterCompanyId, companyById],
  )

  const resolveNatureFromCategoryId = useCallback(
    (categoryId: string) => {
      const classId = categoryClassIdById.get(categoryId)
      return classId ? ledgerNatureByClassId.get(classId) : undefined
    },
    [categoryClassIdById, ledgerNatureByClassId],
  )

  const buildDefaultHierarchy = useCallback((): PlanningRowSelection => {
    const companyId = companies.find((c) => c.active)?.id ?? companies[0]?.id ?? ''
    const classId = classes[0]?.id ?? ''
    const categoryId =
      categories.find((c) => c.active && c.classId === classId)?.id ??
      categories.find((c) => c.active)?.id ??
      ''
    return { companyId, classId, categoryId, costCenterId: '' }
  }, [companies, classes, categories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const code = (r.code ?? '').toLowerCase()
      const composite = resolveCostCenterCompositeCode(r).toLowerCase()
      const name = (r.name ?? '').toLowerCase()
      const category = (categoryNameById.get(r.categoryId) ?? '').toLowerCase()
      const group = resolveGroupName(r).toLowerCase()
      const company = resolveCompanyName(r).toLowerCase()
      const nature = (resolveNatureFromCategoryId(r.categoryId) ?? '').toLowerCase()
      return code.includes(q) || composite.includes(q) || name.includes(q) || category.includes(q) || group.includes(q) || company.includes(q) || nature.includes(q)
    })
  }, [rows, search, categoryNameById, resolveCostCenterCompositeCode, resolveNatureFromCategoryId, resolveGroupName, resolveCompanyName])

  const save = async () => {
    if (!edit.editBuffer) return
    const code = normalizeCostCenterCode(edit.editBuffer.code)
    const name = edit.editBuffer.name.trim()
    if (!code || !name || !edit.editBuffer.categoryId || !edit.editBuffer.companyId) {
      toast.push({
        variant: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha empresa, classe, categoria, código e nome.',
      })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateCostCenter(edit.editBuffer!.id, {
          code,
          name,
          categoryId: edit.editBuffer!.categoryId,
          companyId: edit.editBuffer!.companyId,
          active: edit.editBuffer!.active,
        })
        closeEditDrawer()
        reload()
      },
      'Centro de custo atualizado',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistryDelete(
      toast,
      async () => {
        await mastersService.deleteCostCenter(edit.editBuffer!.id)
        closeEditDrawer()
        reload()
      },
      'Centro de custo excluído',
    )
  }

  return shell(
    'Centros de custo',
    'Hierarquia operacional utilizada no planejamento e no realizado.',
    <>
      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nome, categoria, grupo ou empresa…"
          />
        </FilterField>
      </FilterBar>
      <DataTable<CostCenter>
      rows={filtered}
      columns={[
        {
          id: 'c',
          header: 'Código',
          width: '220px',
          cell: (r) => {
            const composite = resolveCostCenterCompositeCode(r)
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
          id: 'cat',
          header: 'Categoria',
          width: '200px',
          cell: (r) => (
            <span
              className="text-xs text-[var(--color-text2)]"
              title={categoryNameById.get(r.categoryId) ?? r.categoryId}
            >
              {categoryNameById.get(r.categoryId) ?? r.categoryId}
            </span>
          ),
        },
        {
          id: 'n',
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
          cell: (r) => <LedgerNatureCell nature={resolveNatureFromCategoryId(r.categoryId)} />,
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
        title="Novo Centro de Custo"
        onClose={() => setDrawerOpen(false)}
        onSave={async () => {
          const code = normalizeCostCenterCode(newEntry.code ?? '')
          if (
            !code ||
            !newEntry.name?.trim() ||
            !newHierarchy.companyId ||
            !newHierarchy.classId ||
            !newHierarchy.categoryId
          ) {
            toast.push({
              variant: 'error',
              title: 'Campos obrigatórios',
              message: 'Preencha empresa, classe, categoria, código e nome.',
            })
            return
          }
          await runRegistrySave(
            toast,
            async () => {
              await mastersService.createCostCenter({
                code,
                name: newEntry.name.trim(),
                categoryId: newHierarchy.categoryId,
                companyId: newHierarchy.companyId,
                active: true,
              })
              setDrawerOpen(false)
              setNewHierarchy(EMPTY_CC_HIERARCHY)
              setNewEntry({ code: '', name: '' })
              reload()
            },
            'Centro de custo incluído',
          )
        }}
      >
        <PlanningMasterFields
          selection={newHierarchy}
          onSelectionChange={(sel) => {
            setNewHierarchy(sel)
            if (sel.categoryId) {
              setNewEntry((prev) => ({
                ...prev,
                code: nextCostCenterCodeForCategory(rows, sel.categoryId),
              }))
            } else {
              setNewEntry((prev) => ({ ...prev, code: '' }))
            }
          }}
          companies={companies}
          classes={classes}
          categories={categories}
          costCenters={rows}
          hideCostCenter
        />
        <div>
          <label className="label mb-1">Código do centro de custo</label>
          <input
            className={textInputClass()}
            value={newEntry.code}
            onChange={(e) => setNewEntry({ ...newEntry, code: sanitizeCostCenterCodeInput(e.target.value) })}
            placeholder="Ex.: 1"
            maxLength={6}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label mb-1">Nome do centro de custo</label>
          <input
            className={textInputClass()}
            value={newEntry.name}
            onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
          />
        </div>
      </RegistryFormDrawer>

      <RegistryFormDrawer
        open={editOpen}
        title="Editar centro de custo"
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
                  categoryId: edit.editBuffer.categoryId,
                  costCenterId: edit.editBuffer.id,
                  classId: categories.find((c) => c.id === edit.editBuffer!.categoryId)?.classId,
                },
                planningMasters,
              )}
              onSelectionChange={(sel) => {
                edit.setEditBuffer((prev) => {
                  if (!prev) return prev
                  const categoryChanged = sel.categoryId !== prev.categoryId
                  return {
                    ...prev,
                    companyId: sel.companyId,
                    categoryId: sel.categoryId,
                    ...(categoryChanged && sel.categoryId
                      ? {
                          code: nextCostCenterCodeForCategory(
                            rows.filter((row) => row.id !== prev.id),
                            sel.categoryId,
                          ),
                        }
                      : {}),
                  }
                })
              }}
              companies={companies}
              classes={classes}
              categories={categories}
              costCenters={rows}
              hideCostCenter
            />
            <div>
              <label className="label mb-1">Código do centro de custo</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.code}
                onChange={(e) =>
                  edit.setEditBuffer({ ...edit.editBuffer!, code: sanitizeCostCenterCodeInput(e.target.value) })
                }
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label mb-1">Nome do centro de custo</label>
              <input
                className={textInputClass()}
                value={edit.editBuffer.name}
                onChange={(e) => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1">Status</label>
              <ActiveBoolSelect
                value={edit.editBuffer.active}
                onChange={(v) => edit.setEditBuffer({ ...edit.editBuffer!, active: v })}
              />
            </div>
          </>
        ) : null}
      </RegistryFormDrawer>
    </>,
    <ListPageIncluirButton
      contextLabel="Centros de custo"
      onClick={() => {
        const hierarchy = buildDefaultHierarchy()
        setNewHierarchy(hierarchy)
        setNewEntry({
          code: hierarchy.categoryId ? nextCostCenterCodeForCategory(rows, hierarchy.categoryId) : '',
          name: '',
        })
        setDrawerOpen(true)
      }}
    />,
  )
}

export function CategoriesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Category[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newHierarchy, setNewHierarchy] = useState<PlanningRowSelection>(EMPTY_CATEGORY_HIERARCHY)
  const [editCompanyId, setEditCompanyId] = useState('')
  const [newEntry, setNewEntry] = useState<any>({ code: '', name: '', classId: '', active: true })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<Category>()
  const reload = () => {
    loadRegistryRows(toast, () => mastersService.listCompanyGroups(), setGroups)
    loadRegistryRows(toast, () => mastersService.listCompanies(), setCompanies)
    loadRegistryRows(toast, () => mastersService.listCategories(), setRows)
    loadRegistryRows(toast, () => mastersService.listClasses(), setClasses)
  }

  useEffect(() => {
    reload()
  }, [])

  const groupCodeById = useMemo(() => new Map(groups.map((g) => [g.id, g.code])), [groups])
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups])
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])
  const ledgerClassById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const ledgerClassCodeById = useMemo(() => new Map(classes.map((c) => [c.id, c.code])), [classes])

  const resolveCategoryCompanyId = useCallback(
    (category: Category) => ledgerClassById.get(category.classId)?.companyId,
    [ledgerClassById],
  )

  const resolveGroupName = useCallback(
    (category: Category) => {
      const companyId = resolveCategoryCompanyId(category)
      const company = companyId ? companyById.get(companyId) : undefined
      if (!company) return '—'
      return groupNameById.get(company.companyGroupId) ?? '—'
    },
    [resolveCategoryCompanyId, companyById, groupNameById],
  )

  const resolveCompanyName = useCallback(
    (category: Category) => {
      const companyId = resolveCategoryCompanyId(category)
      return companyId ? (companyById.get(companyId)?.name ?? '—') : '—'
    },
    [resolveCategoryCompanyId, companyById],
  )

  const resolveCategoryCompositeCode = useCallback(
    (category: Category, companyId?: string) => {
      const ledgerClassCode = ledgerClassCodeById.get(category.classId)
      if (!ledgerClassCode) return category.code
      const resolvedCompanyId = companyId ?? resolveCategoryCompanyId(category)
      const company =
        (resolvedCompanyId ? companyById.get(resolvedCompanyId) : undefined) ??
        companies.find((c) => c.active) ??
        companies[0]
      if (!company) return category.code
      const groupCode = groupCodeById.get(company.companyGroupId)
      if (!groupCode) return category.code
      return buildCategoryCompositeCode(groupCode, company.code, ledgerClassCode, category.code)
    },
    [companies, companyById, groupCodeById, ledgerClassCodeById, resolveCategoryCompanyId],
  )

  const buildDefaultCategoryHierarchy = useCallback((): PlanningRowSelection => {
    const companyId = companies.find((c) => c.active)?.id ?? companies[0]?.id ?? ''
    const classId = classes[0]?.id ?? ''
    return { companyId, classId, categoryId: '', costCenterId: '' }
  }, [companies, classes])

  const planningMasters = useMemo<PlanningLineMasters>(
    () => ({ companies, companyGroups: groups, costCenters: [], categories: rows, classes }),
    [companies, groups, rows, classes],
  )
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes])
  const ledgerNatureByClassId = useMemo(() => new Map(classes.map((c) => [c.id, c.nature])), [classes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const code = (r.code ?? '').toLowerCase()
      const composite = resolveCategoryCompositeCode(r).toLowerCase()
      const name = (r.name ?? '').toLowerCase()
      const ledgerClass = (classNameById.get(r.classId) ?? '').toLowerCase()
      const nature = (ledgerNatureByClassId.get(r.classId) ?? '').toLowerCase()
      const group = resolveGroupName(r).toLowerCase()
      const company = resolveCompanyName(r).toLowerCase()
      return code.includes(q) || composite.includes(q) || name.includes(q) || ledgerClass.includes(q) || nature.includes(q) || group.includes(q) || company.includes(q)
    })
  }, [rows, search, classNameById, ledgerNatureByClassId, resolveCategoryCompositeCode, resolveGroupName, resolveCompanyName])

  const save = async () => {
    if (!edit.editBuffer) return
    const code = normalizeCategoryCode(edit.editBuffer.code)
    const name = edit.editBuffer.name.trim()
    if (!code || !name || !edit.editBuffer.classId) {
      toast.push({ variant: 'error', title: 'Código, nome e classe são obrigatórios' })
      return
    }
    if (isCategoryCodeTaken(rows, edit.editBuffer.classId, code, edit.editBuffer.id)) {
      toast.push({
        variant: 'error',
        title: 'Código já utilizado',
        message: 'Já existe uma categoria com este código nesta classe.',
      })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateCategory(edit.editBuffer!.id, {
          code,
          name,
          classId: edit.editBuffer!.classId,
          active: edit.editBuffer!.active,
        })
        closeEditDrawer()
        reload()
      },
      'Categoria atualizada',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.deleteCategory(edit.editBuffer!.id)
        closeEditDrawer()
        reload()
      },
      'Registro excluído',
    )
  }

  return shell(
    'Categorias',
    'Plano analítico para orçamento e conciliação.',
    <>
      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nome, classe, grupo ou empresa…"
          />
        </FilterField>
      </FilterBar>
      <DataTable<Category>
      rows={filtered}
      columns={[
        {
          id: 'c',
          header: 'Código',
          width: '200px',
          cell: (r) => {
            const composite = resolveCategoryCompositeCode(r)
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
          id: 'cl',
          header: 'Classe',
          width: '160px',
          cell: (r) => (
            <span className="text-xs text-[var(--color-text2)]">
              {classNameById.get(r.classId) ?? r.classId}
            </span>
          ),
        },
        {
          id: 'n',
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
          cell: (r) => <LedgerNatureCell nature={ledgerNatureByClassId.get(r.classId)} />,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => (
            <RegistryEditButton
              onClick={() => {
                setEditCompanyId(
                  ledgerClassById.get(r.classId)?.companyId ??
                    companies.find((c) => c.active)?.id ??
                    companies[0]?.id ??
                    '',
                )
                openEditDrawer(r)
              }}
            />
          ),
        },
      ]}
    />
      
<RegistryFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nova Categoria" onSave={async () => {
  const code = normalizeCategoryCode(newEntry.code ?? '')
  if (!code || !newEntry.name?.trim() || !newEntry.classId) {
    toast.push({ variant: 'error', title: 'Campos obrigatórios', message: 'Preencha empresa, classe, código e nome.' });
    return;
  }
  if (isCategoryCodeTaken(rows, newEntry.classId, code)) {
    toast.push({
      variant: 'error',
      title: 'Código já utilizado',
      message: 'Já existe uma categoria com este código nesta classe.',
    });
    return;
  }
  await runRegistrySave(toast, async () => {
    await mastersService.createCategory({
      classId: newEntry.classId,
      code,
      name: newEntry.name.trim(),
      active: newEntry.active !== false,
    });
    setDrawerOpen(false);
    setNewHierarchy(EMPTY_CATEGORY_HIERARCHY);
    setNewEntry({ code: '', name: '', classId: '', active: true });
    reload();
  }, 'Categoria incluída');
}}>
  <PlanningMasterFields
    selection={newHierarchy}
    onSelectionChange={(sel) => {
      setNewHierarchy(sel)
      setNewEntry((prev: { code: string; name: string; classId: string; active: boolean }) => ({
        ...prev,
        classId: sel.classId,
        code: sel.classId ? nextCategoryCodeForClass(rows, sel.classId) : '',
      }))
    }}
    companies={companies}
    classes={classes}
    categories={rows}
    costCenters={[]}
    hideCostCenter
    hideCategory
  />
  <div><label className="label mb-1">Código da categoria</label><input className={textInputClass()} value={newEntry.code} onChange={e => setNewEntry({ ...newEntry, code: sanitizeCategoryCodeInput(e.target.value) })} placeholder="Ex.: 1" /></div>
  <div><label className="label mb-1">Nome da categoria</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
  <div><label className="label mb-1">Status</label><ActiveBoolSelect value={newEntry.active} onChange={v => setNewEntry({ ...newEntry, active: v })} activeLabel="Ativa" inactiveLabel="Inativa" /></div>
</RegistryFormDrawer>

<RegistryFormDrawer open={editOpen} title="Editar categoria" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
  {edit.editBuffer ? (
    <>
      <PlanningMasterFields
        selection={resolvePlanningRowSelection(
          {
            companyId: editCompanyId,
            classId: edit.editBuffer.classId,
            categoryId: edit.editBuffer.id,
          },
          planningMasters,
        )}
        onSelectionChange={(sel) => {
          setEditCompanyId(sel.companyId)
          edit.setEditBuffer((prev) => {
            if (!prev) return prev
            const classChanged = sel.classId !== prev.classId
            return {
              ...prev,
              classId: sel.classId,
              ...(classChanged && sel.classId
                ? { code: nextCategoryCodeForClass(rows.filter((row) => row.id !== prev.id), sel.classId) }
                : {}),
            }
          })
        }}
        companies={companies}
        classes={classes}
        categories={rows}
        costCenters={[]}
        hideCostCenter
        hideCategory
      />
      <div><label className="label mb-1">Código da categoria</label><input className={textInputClass()} value={edit.editBuffer.code} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, code: sanitizeCategoryCodeInput(e.target.value) })} placeholder="Ex.: 1" /></div>
      <div><label className="label mb-1">Nome da categoria</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
      <div><label className="label mb-1">Status</label><ActiveBoolSelect value={edit.editBuffer.active} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, active: v })} activeLabel="Ativa" inactiveLabel="Inativa" /></div>
    </>
  ) : null}
</RegistryFormDrawer>

    </>,
    <ListPageIncluirButton
      contextLabel="Categorias"
      onClick={() => {
        const hierarchy = buildDefaultCategoryHierarchy()
        setNewHierarchy(hierarchy)
        setNewEntry({
          code: hierarchy.classId ? nextCategoryCodeForClass(rows, hierarchy.classId) : '',
          name: '',
          classId: hierarchy.classId,
          active: true,
        })
        setDrawerOpen(true)
      }}
    />,
  )
}

const CLASS_NATURE_OPTIONS: SelectOption[] = [
  { value: 'Despesa', label: 'Despesa' },
  { value: 'Receita', label: 'Receita' },
  { value: 'Ativo', label: 'Ativo' },
]

export function ClassesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<LedgerClass[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newHierarchy, setNewHierarchy] = useState<PlanningRowSelection>(EMPTY_LEDGER_HIERARCHY)
  const [editCompanyId, setEditCompanyId] = useState('')
  const [newEntry, setNewEntry] = useState<any>({ code: '', name: '', nature: 'Despesa' })
  const [search, setSearch] = useState('')
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<LedgerClass>()
  const reload = () => {
    loadRegistryRows(toast, () => mastersService.listCompanyGroups(), setGroups)
    loadRegistryRows(toast, () => mastersService.listCompanies(), setCompanies)
    loadRegistryRows(toast, () => mastersService.listClasses(), setRows)
  }

  useEffect(() => {
    reload()
  }, [])

  const groupCodeById = useMemo(() => new Map(groups.map((g) => [g.id, g.code])), [groups])
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups])
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])

  const resolveLedgerClassCompositeCode = useCallback(
    (ledgerClass: LedgerClass, companyId?: string) => {
      const company =
        (companyId ? companyById.get(companyId) : undefined) ??
        (ledgerClass.companyId ? companyById.get(ledgerClass.companyId) : undefined) ??
        companies.find((c) => c.active) ??
        companies[0]
      if (!company) return ledgerClass.code
      const groupCode = groupCodeById.get(company.companyGroupId)
      if (!groupCode) return ledgerClass.code
      return buildLedgerClassCompositeCode(groupCode, company.code, ledgerClass.code)
    },
    [companies, companyById, groupCodeById],
  )

  const resolveGroupName = useCallback(
    (ledgerClass: LedgerClass) => {
      const companyId = ledgerClass.companyId
      const company = companyId ? companyById.get(companyId) : undefined
      if (!company) return '—'
      return groupNameById.get(company.companyGroupId) ?? '—'
    },
    [companyById, groupNameById],
  )

  const resolveCompanyName = useCallback(
    (ledgerClass: LedgerClass) => {
      const company = ledgerClass.companyId ? companyById.get(ledgerClass.companyId) : undefined
      return company?.name ?? '—'
    },
    [companyById],
  )

  const buildDefaultLedgerHierarchy = useCallback((): PlanningRowSelection => {
    const companyId = companies.find((c) => c.active)?.id ?? companies[0]?.id ?? ''
    return { companyId, classId: '', categoryId: '', costCenterId: '' }
  }, [companies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const code = (r.code ?? '').toLowerCase()
      const composite = resolveLedgerClassCompositeCode(r).toLowerCase()
      const name = (r.name ?? '').toLowerCase()
      const nature = (r.nature ?? '').toLowerCase()
      const group = resolveGroupName(r).toLowerCase()
      const company = resolveCompanyName(r).toLowerCase()
      return code.includes(q) || composite.includes(q) || name.includes(q) || nature.includes(q) || group.includes(q) || company.includes(q)
    })
  }, [rows, search, resolveLedgerClassCompositeCode, resolveGroupName, resolveCompanyName])

  const save = async () => {
    if (!edit.editBuffer) return
    const code = normalizeClassCode(edit.editBuffer.code)
    const name = edit.editBuffer.name.trim()
    if (!code || !name) {
      toast.push({ variant: 'error', title: 'Código e nome são obrigatórios' })
      return
    }
    if (!editCompanyId) {
      toast.push({ variant: 'error', title: 'Empresa obrigatória', message: 'Selecione a empresa.' })
      return
    }
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.updateLedgerClass(edit.editBuffer!.id, {
          code,
          name,
          nature: edit.editBuffer!.nature,
          companyId: editCompanyId,
        })
        closeEditDrawer()
        reload()
      },
      'Classe atualizada',
    )
  }

  const handleDelete = async () => {
    if (!edit.editBuffer) return
    await runRegistrySave(
      toast,
      async () => {
        await mastersService.deleteLedgerClass(edit.editBuffer!.id)
        closeEditDrawer()
        reload()
      },
      'Registro excluído',
    )
  }

  return shell(
    'Classes contábeis',
    'Classes para agrupamento gerencial com definição da natureza da rubrica.',
    <>
      <FilterBar className="mt-4">
        <FilterField>
          <SearchInput
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código ou nome…"
          />
        </FilterField>
      </FilterBar>
      <DataTable<LedgerClass>
      rows={filtered}
      columns={[
        {
          id: 'c',
          header: 'Código',
          width: '180px',
          cell: (r) => {
            const composite = resolveLedgerClassCompositeCode(r)
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
          id: 'n',
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
          cell: (r) => <LedgerNatureCell nature={r.nature} />,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => (
            <RegistryEditButton
              onClick={() => {
                setEditCompanyId(r.companyId ?? companies.find((c) => c.active)?.id ?? companies[0]?.id ?? '')
                openEditDrawer(r)
              }}
            />
          ),
        },
      ]}
    />
      <RegistryFormDrawer
        open={drawerOpen}
        title="Nova Classe"
        onClose={() => setDrawerOpen(false)}
        onSave={async () => {
          const code = normalizeClassCode(newEntry.code ?? '')
          if (!code || !newEntry.name?.trim() || !newHierarchy.companyId) {
            toast.push({ variant: 'error', title: 'Campos obrigatórios', message: 'Preencha empresa, código e nome.' })
            return
          }
          await runRegistrySave(
            toast,
            async () => {
              await mastersService.createLedgerClass({
                companyId: newHierarchy.companyId,
                code,
                name: newEntry.name.trim(),
                nature: newEntry.nature,
              })
              setDrawerOpen(false)
              setNewHierarchy(EMPTY_LEDGER_HIERARCHY)
              setNewEntry({ code: '', name: '', nature: 'Despesa' })
              reload()
            },
            'Classe incluída',
          )
        }}
      >
        <PlanningMasterFields
          selection={newHierarchy}
          onSelectionChange={(sel) => {
            setNewHierarchy(sel)
            if (sel.companyId) {
              setNewEntry((prev: { code: string; name: string; nature: string; companyId?: string; active?: boolean }) => ({
                ...prev,
                code: nextClassCode(rows.filter((row) => row.companyId === sel.companyId)),
              }))
            }
          }}
          companies={companies}
          classes={rows}
          categories={[]}
          costCenters={[]}
          hideClass
          hideCategory
          hideCostCenter
        />
        <div>
          <label className="label mb-1">Código da classe</label>
          <input
            className={textInputClass()}
            value={newEntry.code}
            onChange={(e) => setNewEntry({ ...newEntry, code: sanitizeClassCodeInput(e.target.value) })}
            placeholder="Ex.: 1"
          />
        </div>
        <div>
          <label className="label mb-1">Nome da classe</label>
          <input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} />
        </div>
        <div>
          <label className="label mb-1">Natureza</label>
          <Select value={newEntry.nature} onChange={v => setNewEntry({ ...newEntry, nature: String(v) })} options={CLASS_NATURE_OPTIONS} placeholder="Natureza" />
        </div>
      </RegistryFormDrawer>

      <RegistryFormDrawer open={editOpen} title="Editar classe" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
        {edit.editBuffer ? (
          <>
            <PlanningMasterFields
              selection={{ companyId: editCompanyId, classId: '', categoryId: '', costCenterId: '' }}
              onSelectionChange={(sel) => setEditCompanyId(sel.companyId)}
              companies={companies}
              classes={rows}
              categories={[]}
              costCenters={[]}
              hideClass
              hideCategory
              hideCostCenter
            />
            <div><label className="label mb-1">Código da classe</label><input className={textInputClass()} value={edit.editBuffer.code} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, code: sanitizeClassCodeInput(e.target.value) })} placeholder="Ex.: 1" /></div>
            <div><label className="label mb-1">Nome da classe</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
            <div><label className="label mb-1">Natureza</label><Select value={edit.editBuffer.nature ?? ''} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, nature: String(v) })} options={CLASS_NATURE_OPTIONS} placeholder="Natureza" /></div>
          </>
        ) : null}
      </RegistryFormDrawer>
    </>,
    <ListPageIncluirButton
      contextLabel="Classes contábeis"
      onClick={() => {
        const hierarchy = buildDefaultLedgerHierarchy()
        setNewHierarchy(hierarchy)
        setNewEntry({
          code: hierarchy.companyId ? nextClassCode(rows.filter((row) => row.companyId === hierarchy.companyId)) : nextClassCode(rows),
          name: '',
          nature: 'Despesa',
        })
        setDrawerOpen(true)
      }}
    />,
  )
}

export function ProjectsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Project[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<any>({ code: '', name: '', active: true })
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<Project>()
  useEffect(() => {
    void mastersService.listProjects().then(setRows)
  }, [])

  const save = () => {
    if (!edit.editBuffer) return
    const code = edit.editBuffer.code.trim()
    const name = edit.editBuffer.name.trim()
    if (!code || !name) {
      toast.push({ variant: 'error', title: 'Código e nome são obrigatórios' })
      return
    }
    setRows((prev) => prev.map((x) => (x.id === edit.editBuffer!.id ? { ...edit.editBuffer!, code, name } : x)))
    toast.push({ variant: 'success', title: 'Projeto atualizado' })
    closeEditDrawer()
  }

  const handleDelete = () => {
    if (!edit.editBuffer) return
    setRows((prev) => prev.filter((x) => x.id !== edit.editBuffer!.id))
    toast.push({ variant: 'success', title: 'Registro excluído' })
    closeEditDrawer()
  }

  return shell(
    'Projetos',
    'Projetos estratégicos com alocação orçamentária.',
    <>
      <DataTable<Project>
      rows={rows}
      columns={[
        {
          id: 'c',
          header: 'Código',
          cell: (r) => (
            <span className="font-mono text-xs text-[var(--color-text)]" title={r.code}>
              {r.code}
            </span>
          ),
        },
        {
          id: 'n',
          header: 'Nome',
          cell: (r) => (
            <span className="text-[var(--color-text)]" title={r.name}>
              {r.name}
            </span>
          ),
        },
        {
          id: 'a',
          header: 'Status',
          cell: (r) => <span className="badge">{r.active ? 'Ativo' : 'Inativo'}</span>,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
        },
      ]}
    />
      
<RegistryFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Novo Projeto" onSave={() => {
  if (!newEntry.code?.trim() || !newEntry.name?.trim()) return;
  setRows(prev => [{ id: `prj-${Date.now()}`, code: newEntry.code.trim(), name: newEntry.name.trim(), active: newEntry.active !== false }, ...prev]);
  setDrawerOpen(false);
  setNewEntry({ code: '', name: '', active: true });
}}>
  <div><label className="label mb-1">Código</label><input className={textInputClass()} value={newEntry.code} onChange={e => setNewEntry({ ...newEntry, code: e.target.value })} /></div>
  <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
  <div><label className="label mb-1">Status</label><ActiveBoolSelect value={newEntry.active} onChange={v => setNewEntry({ ...newEntry, active: v })} activeLabel="Ativo" inactiveLabel="Inativo" /></div>
</RegistryFormDrawer>

<RegistryFormDrawer open={editOpen} title="Editar projeto" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
  {edit.editBuffer ? (
    <>
      <div><label className="label mb-1">Código</label><input className={textInputClass()} value={edit.editBuffer.code} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, code: e.target.value })} /></div>
      <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
      <div><label className="label mb-1">Status</label><ActiveBoolSelect value={edit.editBuffer.active} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, active: v })} activeLabel="Ativo" inactiveLabel="Inativo" /></div>
    </>
  ) : null}
</RegistryFormDrawer>

    </>,
    <ListPageIncluirButton contextLabel="Projetos" onClick={() => setDrawerOpen(true)} />,
  )
}



export function MasterUsersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<UserAccount[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<any>({ name: '', email: '', role: 'consulta', active: true })
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<UserAccount>()
  useEffect(() => {
    void mastersService.listUsers().then(setRows)
  }, [])

  const save = () => {
    if (!edit.editBuffer) return
    const name = edit.editBuffer.name.trim()
    const email = edit.editBuffer.email.trim()
    if (!name || !email) {
      toast.push({ variant: 'error', title: 'Nome e e-mail são obrigatórios' })
      return
    }
    setRows((prev) =>
      prev.map((x) =>
        x.id === edit.editBuffer!.id
          ? { ...edit.editBuffer!, name, email, role: edit.editBuffer!.role as UserRole }
          : x,
      ),
    )
    toast.push({ variant: 'success', title: 'Usuário atualizado' })
    closeEditDrawer()
  }

  const handleDelete = () => {
    if (!edit.editBuffer) return
    setRows((prev) => prev.filter((x) => x.id !== edit.editBuffer!.id))
    toast.push({ variant: 'success', title: 'Registro excluído' })
    closeEditDrawer()
  }

  return shell(
    'Usuários (cadastro mestre)',
    'Identidades corporativas integradas ao backend; perfis controlam a UX.',
    <>
      <DataTable<UserAccount>
      rows={rows}
      columns={[
        {
          id: 'nm',
          header: 'Nome',
          cell: (r) => (
            <span className="text-[var(--color-text)]" title={r.name}>
              {r.name}
            </span>
          ),
        },
        {
          id: 'em',
          header: 'E-mail',
          cell: (r) => (
            <span className="font-mono text-xs text-[var(--color-text)]" title={r.email}>
              {r.email}
            </span>
          ),
        },
        {
          id: 'rl',
          header: 'Perfil',
          cell: (r) => <span className="badge">{r.role}</span>,
        },
        {
          id: 'a',
          header: 'Status',
          cell: (r) => <span className="badge">{r.active ? 'Ativo' : 'Inativo'}</span>,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
        },
      ]}
    />
      
<RegistryFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Novo Usuário" onSave={() => {
  if (!newEntry.name?.trim() || !newEntry.email?.trim()) {
      toast.push({ variant: 'error', title: 'Nome e email obrigatórios' });
      return;
  }
  setRows(prev => [{ id: `u-${Date.now()}`, name: newEntry.name.trim(), email: newEntry.email.trim(), role: newEntry.role, active: newEntry.active !== false }, ...prev]);
  setDrawerOpen(false);
  setNewEntry({ name: '', email: '', role: 'consulta', active: true });
}}>
  <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
  <div><label className="label mb-1">E-mail</label><input className={textInputClass()} value={newEntry.email} onChange={e => setNewEntry({ ...newEntry, email: e.target.value })} /></div>
  <div><label className="label mb-1">Role</label><Select value={newEntry.role} onChange={v => setNewEntry({ ...newEntry, role: String(v) })} options={USER_ROLE_OPTIONS} /></div>
  <div><label className="label mb-1">Status</label><ActiveBoolSelect value={newEntry.active} onChange={v => setNewEntry({ ...newEntry, active: v })} activeLabel="Ativo" inactiveLabel="Inativo" /></div>
</RegistryFormDrawer>

<RegistryFormDrawer open={editOpen} title="Editar usuário" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
  {edit.editBuffer ? (
    <>
      <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
      <div><label className="label mb-1">E-mail</label><input className={textInputClass()} type="email" value={edit.editBuffer.email} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, email: e.target.value })} /></div>
      <div><label className="label mb-1">Role</label><Select value={edit.editBuffer.role} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, role: v as UserRole })} options={USER_ROLE_OPTIONS} /></div>
      <div><label className="label mb-1">Status</label><ActiveBoolSelect value={edit.editBuffer.active} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, active: v })} activeLabel="Ativo" inactiveLabel="Inativo" /></div>
    </>
  ) : null}
</RegistryFormDrawer>

    </>,
    <ListPageIncluirButton contextLabel="Usuários" onClick={() => setDrawerOpen(true)} />,
  )
}

export function ProfilesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<RoleProfile[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<any>({ name: '', key: '' })
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<RoleProfile>()
  useEffect(() => {
    void mastersService.listProfiles().then(setRows)
  }, [])

  const save = () => {
    if (!edit.editBuffer) return
    const name = edit.editBuffer.name.trim()
    if (!name) {
      toast.push({ variant: 'error', title: 'Nome obrigatório' })
      return
    }
    setRows((prev) =>
      prev.map((x) =>
        x.id === edit.editBuffer!.id
          ? {
              ...edit.editBuffer!,
              name,
              description: edit.editBuffer!.description?.trim() || undefined,
            }
          : x,
      ),
    )
    toast.push({ variant: 'success', title: 'Perfil atualizado' })
    closeEditDrawer()
  }

  const handleDelete = () => {
    if (!edit.editBuffer) return
    setRows((prev) => prev.filter((x) => x.id !== edit.editBuffer!.id))
    toast.push({ variant: 'success', title: 'Registro excluído' })
    closeEditDrawer()
  }

  return shell(
    'Perfis',
    'Conjunto de permissões preparado para RBAC no backend.',
    <>
      <DataTable<RoleProfile>
      rows={rows}
      columns={[
        {
          id: 'n',
          header: 'Nome',
          cell: (r) => (
            <span className="text-[var(--color-text)]" title={r.name}>
              {r.name}
            </span>
          ),
        },
        {
          id: 'k',
          header: 'Chave',
          cell: (r) => <span className="font-mono text-xs text-[var(--color-text2)]">{r.key}</span>,
        },
        {
          id: 'd',
          header: 'Descrição',
          cell: (r) => (
            <span className="text-[var(--color-text2)]" title={r.description ?? undefined}>
              {r.description ?? '—'}
            </span>
          ),
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
        },
      ]}
    />
      
<RegistryFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Novo Perfil" onSave={() => {
  if (!newEntry.name?.trim() || !newEntry.key?.trim()) return;
  setRows(prev => [{ id: `prf-${Date.now()}`, name: newEntry.name.trim(), key: newEntry.key.trim() }, ...prev]);
  setDrawerOpen(false);
  setNewEntry({ name: '', key: '' });
}}>
  <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
  <div><label className="label mb-1">Chave (Role DB)</label><input className={textInputClass()} value={newEntry.key} onChange={e => setNewEntry({ ...newEntry, key: e.target.value })} /></div>
</RegistryFormDrawer>

<RegistryFormDrawer open={editOpen} title="Editar perfil" onClose={closeEditDrawer} onSave={save} onDelete={handleDelete}>
  {edit.editBuffer ? (
    <>
      <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
      <div><label className="label mb-1">Chave</label><input className={textInputClass()} value={edit.editBuffer.key} readOnly disabled /></div>
      <div><label className="label mb-1">Descrição</label><input className={textInputClass()} value={edit.editBuffer.description ?? ''} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, description: e.target.value || undefined })} /></div>
    </>
  ) : null}
</RegistryFormDrawer>

    </>,
    <ListPageIncluirButton contextLabel="Perfis" onClick={() => setDrawerOpen(true)} />,
  )
}
