import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import {
  PageHeader,
  DataTable,
  FilterBar,
  FilterField,
  ListPageIncluirButton,
  Select,
  ActiveBoolSelect,
  Drawer,
} from '@/components/ui'
import { UserAccessFields } from '@/components/admin/UserAccessFields'
import { adminService } from '@/services/modules/admin.service'
import { mastersService } from '@/services/modules/masters.service'
import { EMPTY_USER_ACCESS, normalizeUserAccess } from '@/lib/user-access'
import { MASTERS_CHANGED_EVENT } from '@/lib/masters-events'
import { getErrorMessage } from '@/services/api/errors'
import type { AuditLogEntry, SystemParameter, UserAccount, UserAccessScope } from '@/types/entities'
import type { UserRole } from '@/types/entities'
import { useToast } from '@/context/toast-context'
import { useInlineRowEdit } from '@/hooks/useInlineRowEdit'
import { USER_ROLE_OPTIONS } from '@/lib/user-role-options'
import type { SelectOption } from '@/components/ui/Select'
import { formatAuditActionLabel } from '@/lib/formatters/audit-action'
import { formatDateTimePt } from '@/lib/formatters/date'
import { roleLabels } from '@/modules/auth/permissions'
import { roleHasScopedAccess } from '@/lib/scoped-access-roles'
import { validateAdminPassword } from '@/lib/validators/admin-password'

export function RegistryFormDrawer({
  open,
  onClose,
  title,
  onSave,
  onDelete,
  children,
  width = 520,
}: {
  open: boolean
  onClose: () => void
  title: string
  onSave: () => void
  onDelete?: () => void
  children: React.ReactNode
  width?: number
}) {
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      width={width}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-toolbar-secondary" onClick={onClose}>
            Cancelar
          </button>
          {onDelete ? (
            <button type="button" className="btn-toolbar-secondary" onClick={onDelete}>
              Excluir
            </button>
          ) : null}
          <button type="button" className="btn-toolbar-primary" onClick={onSave}>
            Salvar
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

function shell(title: string, description: string, children: ReactNode, actions?: ReactNode) {
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

function normalizeAuditSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function matchesAuditSearch(value: string, query: string) {
  const normalizedQuery = normalizeAuditSearch(query)
  if (!normalizedQuery) return true
  return normalizeAuditSearch(value).includes(normalizedQuery)
}

const AUDIT_ACTION_FILTER_OPTIONS: SelectOption[] = [
  { value: 'create', label: formatAuditActionLabel('create') },
  { value: 'update', label: formatAuditActionLabel('update') },
  { value: 'delete', label: formatAuditActionLabel('delete') },
]

type UserAccountEdit = UserAccount & { password?: string }

export function AdminUsersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<{
    name: string
    email: string
    role: UserRole
    active: boolean
    password: string
    access: UserAccessScope
    allowResumo: boolean
  }>({
    name: '',
    email: '',
    role: 'operador',
    active: true,
    password: '',
    access: { ...EMPTY_USER_ACCESS },
    allowResumo: true,
  })
  const [masterOptions, setMasterOptions] = useState({
    companyGroups: [] as SelectOption[],
    companies: [] as SelectOption[],
    classes: [] as SelectOption[],
    categories: [] as SelectOption[],
    costCenters: [] as SelectOption[],
    budgetItems: [] as SelectOption[],
  })
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<UserAccountEdit>()

  const loadUsers = () => {
    setLoading(true)
    void adminService
      .listUsers()
      .then(setRows)
      .catch((e) => toast.push({ variant: 'error', title: 'Falha ao carregar usuários', message: getErrorMessage(e) }))
      .finally(() => setLoading(false))
  }

  const loadMasterOptions = useCallback(() => {
    void Promise.all([
      mastersService.listCompanyGroups(),
      mastersService.listCompanies(),
      mastersService.listClasses(),
      mastersService.listCategories(),
      mastersService.listCostCenters(),
      mastersService.listBudgetItems(),
    ])
      .then(([companyGroups, companies, classes, categories, costCenters, budgetItems]) => {
        setMasterOptions({
          companyGroups: companyGroups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` })),
          companies: companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          classes: classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          categories: categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          costCenters: costCenters.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          budgetItems: budgetItems.map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })),
        })
      })
      .catch((e) => {
        toast.push({
          variant: 'error',
          title: 'Falha ao carregar cadastros para acessos',
          message: getErrorMessage(e),
        })
      })
  }, [toast])

  useEffect(() => {
    loadUsers()
    loadMasterOptions()
  }, [loadMasterOptions])

  useEffect(() => {
    const refresh = () => loadMasterOptions()
    window.addEventListener(MASTERS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(MASTERS_CHANGED_EVENT, refresh)
  }, [loadMasterOptions])

  useEffect(() => {
    if (drawerOpen || editOpen) loadMasterOptions()
  }, [drawerOpen, editOpen, loadMasterOptions])

  const showAccessFields = (role: UserRole) => roleHasScopedAccess(role)

  const save = async () => {
    if (!edit.editBuffer) return
    const name = edit.editBuffer.name.trim()
    const email = edit.editBuffer.email.trim()
    if (!name || !email) {
      toast.push({ variant: 'error', title: 'Nome e e-mail são obrigatórios' })
      return
    }
    const password = edit.editBuffer.password?.trim()
    if (password) {
      const passwordError = validateAdminPassword(password)
      if (passwordError) {
        toast.push({ variant: 'error', title: 'Senha inválida', message: passwordError })
        return
      }
    }
    try {
      const updated = await adminService.updateUser(edit.editBuffer.id, {
        name,
        email,
        role: edit.editBuffer.role,
        active: edit.editBuffer.active,
        access: edit.editBuffer.access,
        allowResumo: edit.editBuffer.allowResumo,
        ...(password ? { password } : {}),
      })
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      toast.push({ variant: 'success', title: 'Usuário atualizado' })
      closeEditDrawer()
    } catch (e) {
      toast.push({ variant: 'error', title: 'Falha ao salvar', message: getErrorMessage(e) })
    }
  }

  return shell(
    'Gestão de usuários',
    'Provisionamento, bloqueio e definição de acessos por cadastro mestre.',
    <>
      <DataTable<UserAccount>
      rows={loading ? [] : rows}
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
          id: 'e',
          header: 'E-mail',
          cell: (r) => (
            <span className="font-mono text-xs text-[var(--color-text)]" title={r.email}>
              {r.email}
            </span>
          ),
        },
        {
          id: 'r',
          header: 'Papel',
          cell: (r) => <span className="badge">{roleLabels[r.role] ?? r.role}</span>,
        },
        {
          id: 'a',
          header: 'Ativo',
          cell: (r) => <span className="badge">{r.active ? 'sim' : 'não'}</span>,
        },
        {
          id: 'act',
          header: 'Ações',
          width: '132px',
          cell: (r) => (
            <RegistryEditButton
              onClick={() =>
                openEditDrawer({
                  ...r,
                  access: normalizeUserAccess(r.access),
                })
              }
            />
          ),
        },
      ]}
    />
      <RegistryFormDrawer
        open={drawerOpen}
        title="Novo usuário"
        onClose={() => setDrawerOpen(false)}
        onSave={() => {
          void (async () => {
            if (!newEntry.name.trim() || !newEntry.email.trim()) {
              toast.push({ variant: 'error', title: 'Nome e e-mail são obrigatórios' })
              return
            }
            if (!newEntry.password.trim()) {
              toast.push({ variant: 'error', title: 'Senha inicial obrigatória' })
              return
            }
            const passwordError = validateAdminPassword(newEntry.password)
            if (passwordError) {
              toast.push({ variant: 'error', title: 'Senha inválida', message: passwordError })
              return
            }
            try {
              const created = await adminService.createUser({
                name: newEntry.name.trim(),
                email: newEntry.email.trim(),
                role: newEntry.role,
                active: newEntry.active,
                password: newEntry.password,
                access: showAccessFields(newEntry.role) ? newEntry.access : undefined,
                allowResumo: newEntry.allowResumo,
              })
              setRows((prev) => [created, ...prev])
              toast.push({ variant: 'success', title: 'Usuário incluído' })
              setDrawerOpen(false)
              setNewEntry({
                name: '',
                email: '',
                role: 'operador',
                active: true,
                password: '',
                access: { ...EMPTY_USER_ACCESS },
                allowResumo: true,
              })
            } catch (e) {
              toast.push({ variant: 'error', title: 'Falha ao incluir', message: getErrorMessage(e) })
            }
          })()
        }}
      >
        <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} /></div>
        <div><label className="label mb-1">E-mail</label><input className={textInputClass()} value={newEntry.email} onChange={e => setNewEntry({ ...newEntry, email: e.target.value })} /></div>
        <div><label className="label mb-1">Senha inicial</label><input className={textInputClass()} type="password" value={newEntry.password} onChange={e => setNewEntry({ ...newEntry, password: e.target.value })} placeholder="Mín. 10 caracteres, maiúscula, número e símbolo" /></div>
        <div><label className="label mb-1">Papel</label><Select value={newEntry.role} onChange={v => setNewEntry({ ...newEntry, role: v as UserRole })} options={USER_ROLE_OPTIONS} /></div>
        <div><label className="label mb-1">Status</label><ActiveBoolSelect value={newEntry.active} onChange={v => setNewEntry({ ...newEntry, active: v })} activeLabel="sim" inactiveLabel="não" /></div>
        <div><label className="label mb-1">Acesso ao menu Resumo</label><ActiveBoolSelect value={newEntry.allowResumo} onChange={v => setNewEntry({ ...newEntry, allowResumo: v })} activeLabel="permitido" inactiveLabel="bloqueado" /></div>
        {showAccessFields(newEntry.role) ? (
          <UserAccessFields
            role={newEntry.role}
            value={newEntry.access}
            onChange={(access) => setNewEntry({ ...newEntry, access })}
            companyGroupOptions={masterOptions.companyGroups}
            companyOptions={masterOptions.companies}
            classOptions={masterOptions.classes}
            categoryOptions={masterOptions.categories}
            costCenterOptions={masterOptions.costCenters}
            budgetItemOptions={masterOptions.budgetItems}
          />
        ) : null}
      </RegistryFormDrawer>

      <RegistryFormDrawer open={editOpen} title="Editar usuário" onClose={closeEditDrawer} onSave={() => void save()}>
        {edit.editBuffer ? (
          <>
            <div><label className="label mb-1">Nome</label><input className={textInputClass()} value={edit.editBuffer.name} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, name: e.target.value })} /></div>
            <div><label className="label mb-1">E-mail</label><input className={textInputClass()} type="email" value={edit.editBuffer.email} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, email: e.target.value })} /></div>
            <div><label className="label mb-1">Papel</label><Select value={edit.editBuffer.role} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, role: v as UserRole })} options={USER_ROLE_OPTIONS} /></div>
            <div><label className="label mb-1">Status</label><ActiveBoolSelect value={edit.editBuffer.active} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, active: v })} activeLabel="sim" inactiveLabel="não" /></div>
            <div><label className="label mb-1">Acesso ao menu Resumo</label><ActiveBoolSelect value={edit.editBuffer.allowResumo ?? true} onChange={v => edit.setEditBuffer({ ...edit.editBuffer!, allowResumo: v })} activeLabel="permitido" inactiveLabel="bloqueado" /></div>
            <div>
              <label className="label mb-1">Nova senha (opcional)</label>
              <input
                className={textInputClass()}
                type="password"
                value={edit.editBuffer.password ?? ''}
                onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, password: e.target.value })}
                placeholder="Deixe em branco para manter a atual"
              />
            </div>
            {showAccessFields(edit.editBuffer.role) ? (
              <UserAccessFields
                role={edit.editBuffer.role}
                value={normalizeUserAccess(edit.editBuffer.access)}
                onChange={(access) => edit.setEditBuffer({ ...edit.editBuffer!, access })}
                companyGroupOptions={masterOptions.companyGroups}
                companyOptions={masterOptions.companies}
                classOptions={masterOptions.classes}
                categoryOptions={masterOptions.categories}
                costCenterOptions={masterOptions.costCenters}
                budgetItemOptions={masterOptions.budgetItems}
              />
            ) : null}
          </>
        ) : null}
      </RegistryFormDrawer>
    </>,
    <ListPageIncluirButton contextLabel="Gestão de usuários" onClick={() => setDrawerOpen(true)} />,
  )
}

export function AdminPermissionsPage() {
  return shell(
    'Permissões',
    'Matriz de papÃ©is: Administrador, Operador e Consulta â€” regras crÃ­ticas validadas no servidor.',
    <div className="glass glass-hover rounded-[var(--radius-lg)] p-6 text-sm text-[var(--color-text2)]">
      A UI de permissionamento fino (módulos/ações) deve refletir contratos <span className="font-mono text-[var(--color-text)]">/admin/roles</span> no
      backend.
    </div>,
    <ListPageIncluirButton
      contextLabel="Permissões (matriz)"
      label="Configurar matriz"
      toastTitle="Permissões"
      message="O editor da matriz (papéis, módulos e ações) será aberto aqui quando o módulo estiver liberado. Alterações sensíveis continuam validadas no servidor."
    />,
  )
}

export function AdminParametersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<SystemParameter[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newEntry, setNewEntry] = useState<Partial<SystemParameter>>({ key: '', value: '', description: '' })
  const { editOpen, edit, closeEditDrawer, openEditDrawer } = useRegistryEditDrawer<SystemParameter>()
  useEffect(() => {
    void adminService.listParameters().then(setRows)
  }, [])

  const save = async () => {
    if (!edit.editBuffer) return
    const value = edit.editBuffer.value.trim()
    if (!value) {
      toast.push({ variant: 'error', title: 'Valor obrigatório' })
      return
    }
    try {
      await adminService.saveParameter({ ...edit.editBuffer, value, description: edit.editBuffer.description?.trim() || undefined })
      setRows((prev) => prev.map((x) => (x.id === edit.editBuffer!.id ? { ...edit.editBuffer!, value, description: edit.editBuffer!.description } : x)))
      toast.push({ variant: 'success', title: 'Parâmetro salvo' })
      closeEditDrawer()
    } catch {
      toast.push({ variant: 'error', title: 'Falha ao salvar' })
    }
  }

  return shell(
    'Parâmetros',
    'Baseline de comportamento (ex.: tolerâncias) persistidos em Postgres via API.',
    <>
      <DataTable<SystemParameter>
      rows={rows}
      columns={[
        {
          id: 'k',
          header: 'Chave',
          cell: (r) => <span className="font-mono text-xs text-[var(--color-text2)]">{r.key}</span>,
        },
        {
          id: 'v',
          header: 'Valor',
          cell: (r) => (
            <span className="text-[var(--color-text)]" title={r.value}>
              {r.value}
            </span>
          ),
        },
        {
          id: 'd',
          header: 'Descrição',
          cell: (r) => (
            <span className="text-[var(--color-text2)]" title={r.description ?? undefined}>
              {r.description ?? 'â€”'}
            </span>
          ),
        },
        {
          id: 'x',
          header: 'Ações',
          width: '132px',
          cell: (r) => <RegistryEditButton onClick={() => openEditDrawer(r)} />,
        },
      ]}
    />
      <RegistryFormDrawer
        open={drawerOpen}
        title="Novo Parâmetro"
        onClose={() => setDrawerOpen(false)}
        onSave={() => {
          if (!newEntry.key?.trim() || !newEntry.value?.trim()) {
            toast.push({ variant: 'error', title: 'Chave e Valor obrigatórios' })
            return
          }
          setRows((prev) => [
            { id: `p-${Date.now()}`, key: newEntry.key!.trim(), value: newEntry.value!.trim(), description: newEntry.description },
            ...prev,
          ])
          toast.push({ variant: 'success', title: 'Parâmetro incluído', message: 'Salvo localmente.' })
          setDrawerOpen(false)
          setNewEntry({ key: '', value: '', description: '' })
        }}
      >
        <div><label className="label mb-1">Chave</label><input className={textInputClass()} value={newEntry.key} onChange={e => setNewEntry({ ...newEntry, key: e.target.value })} /></div>
        <div><label className="label mb-1">Valor</label><input className={textInputClass()} value={newEntry.value} onChange={e => setNewEntry({ ...newEntry, value: e.target.value })} /></div>
        <div><label className="label mb-1">Descrição</label><input className={textInputClass()} value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} /></div>
      </RegistryFormDrawer>

      <RegistryFormDrawer open={editOpen} title="Editar parâmetro" onClose={closeEditDrawer} onSave={() => void save()}>
        {edit.editBuffer ? (
          <>
            <div><label className="label mb-1">Chave</label><input className={textInputClass()} value={edit.editBuffer.key} readOnly disabled /></div>
            <div><label className="label mb-1">Valor</label><input className={textInputClass()} value={edit.editBuffer.value} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, value: e.target.value })} /></div>
            <div><label className="label mb-1">Descrição</label><input className={textInputClass()} value={edit.editBuffer.description ?? ''} onChange={e => edit.setEditBuffer({ ...edit.editBuffer!, description: e.target.value || undefined })} /></div>
          </>
        ) : null}
      </RegistryFormDrawer>
    </>,
    <ListPageIncluirButton contextLabel="Parâmetros" onClick={() => setDrawerOpen(true)} />,
  )
}

export function AdminAuditPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    description: '',
    from: '',
    to: '',
  })

  useEffect(() => {
    void Promise.all([adminService.listAudit(), adminService.listUsers()]).then(([logs, users]) => {
      const byId = new Map(users.map((u) => [u.id, u.name || u.email]))
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      setRows(
        logs.map((log) => ({
          ...log,
          actor: uuidRe.test(log.actor) ? (byId.get(log.actor) ?? 'Usuário removido') : log.actor,
        })),
      )
    })
  }, [])

  const filteredRows = useMemo(() => {
    const ordered = [...rows].sort((a, b) => b.at.localeCompare(a.at))

    return ordered.filter((row) => {
      if (!matchesAuditSearch(row.actor, filters.actor)) return false
      if (filters.action && row.action !== filters.action) return false

      if (!matchesAuditSearch(row.description, filters.description)) return false
      if (filters.from && row.at.slice(0, 10) < filters.from) return false
      if (filters.to && row.at.slice(0, 10) > filters.to) return false
      return true
    })
  }, [filters.action, filters.actor, filters.description, filters.from, filters.to, rows])

  const clearFilters = useCallback(() => {
    setFilters({ actor: '', action: '', description: '', from: '', to: '' })
  }, [])

  return shell(
    'Logs de auditoria',
    'Registro de crções, alterações e exclusões realizadas pelos usuários.',
    <div className="space-y-4">
      <FilterBar className="overflow-visible">
        <FilterField label="Usuário" className="min-w-[12rem] flex-1">
          <input
            className={textInputClass()}
            value={filters.actor}
            onChange={(e) => setFilters((current) => ({ ...current, actor: e.target.value }))}
            placeholder="Buscar por usuário"
          />
        </FilterField>
        <FilterField label="Ação" className="min-w-[11rem]">
          <Select
            value={filters.action}
            onChange={(value) => setFilters((current) => ({ ...current, action: value }))}
            options={AUDIT_ACTION_FILTER_OPTIONS}
            placeholder="Todas as ações"
          />
        </FilterField>
        <FilterField label="Descrição" className="min-w-[14rem] flex-1">
          <input
            className={textInputClass()}
            value={filters.description}
            onChange={(e) => setFilters((current) => ({ ...current, description: e.target.value }))}
            placeholder="Buscar na descrição"
          />
        </FilterField>
        <FilterField label="Período inicial" className="min-w-[10rem]">
          <input
            type="date"
            className={textInputClass()}
            value={filters.from}
            onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))}
          />
        </FilterField>
        <FilterField label="Período final" className="min-w-[10rem]">
          <input
            type="date"
            className={textInputClass()}
            value={filters.to}
            onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))}
          />
        </FilterField>
        <div className="ml-auto flex items-end gap-3">
          <div className="pb-1 text-xs text-[var(--color-text2)]">
            {filteredRows.length} de {rows.length} registros
          </div>
          <button type="button" className="btn-ghost rounded-md px-3 py-2 text-xs" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>
      </FilterBar>

      {filteredRows.length > 0 ? (
        <DataTable<AuditLogEntry>
          rows={filteredRows}
          stickyHeader
          columns={[
            { id: 'u', header: 'Usuário', cell: (r) => r.actor },
            { id: 'a', header: 'Ação', cell: (r) => formatAuditActionLabel(r.action) },
            {
              id: 'desc',
              header: 'Descrição',
              cell: (r) => (
                <span className="max-w-md whitespace-normal text-left text-[13px] text-[var(--color-text)]">
                  {r.description || '?'}
                </span>
              ),
            },
            {
              id: 'd',
              header: 'Data',
              cell: (r) => (
                <span className="font-mono text-xs text-[var(--color-text2)]">{formatDateTimePt(r.at)}</span>
              ),
            },
          ]}
        />
      ) : (
        <div className="glass glass-hover rounded-[var(--radius-lg)] px-5 py-8 text-center text-sm text-[var(--color-text2)]">
          Nenhum log encontrado com os filtros atuais.
        </div>
      )}
    </div>,
  )
}


export function AdminSettingsPage() {
  return shell(
    'Configurações do sistema',
    'Preferências globais e feature flags concedidas somente após validação na API.',
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="glass glass-hover rounded-[var(--radius-lg)] p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">Branding & locale</div>
        <p className="mt-2 text-sm text-[var(--color-text2)]">Moeda BRL · pt-BR · dark premium somente na camada de apresentação.</p>
      </div>
      <div className="glass glass-hover rounded-[var(--radius-lg)] p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">Segurança</div>
        <p className="mt-2 text-sm text-[var(--color-text2)]">JWT via API · refresh preparado · Storage assinado no backend.</p>
      </div>
    </div>,
    <ListPageIncluirButton
      contextLabel="Configurações do sistema"
      label="Editar preferências"
      toastTitle="Configurações"
      message="As telas para ajustar marca, idioma e opções avançadas serão liberadas aqui após a homologação com o time de segurança."
    />,
  )
}
