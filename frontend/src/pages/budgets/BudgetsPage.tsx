import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus } from 'lucide-react'
import {
  PageHeader,
  DataTable,
  Drawer,
  FilterBar,
  FilterField,
  Select,
  ListPageIncluirButton,
} from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'
import { budgetsService } from '@/services/modules/budgets.service'
import { mastersService } from '@/services/modules/masters.service'
import type { Budget, BudgetStatus, BudgetVersionDetail, BudgetVersionType, CompanyGroup } from '@/types/entities'
import { formatDatePt } from '@/lib/formatters/date'
import { useToast } from '@/context/toast-context'
import { useConfirm } from '@/context/confirm-context'
import { getErrorMessage } from '@/services/api/errors'
import { useGlobalFilters } from '@/context/global-filters-context'
import { useCanMutate } from '@/hooks/useCanMutate'

const STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}

const VERSION_TYPE_LABELS: Record<BudgetVersionType, string> = {
  ORIGINAL: 'Original',
  REVISION: 'Revisão',
  FORECAST: 'Forecast',
}

const VERSION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'REVISION', label: 'Revisão' },
  { value: 'FORECAST', label: 'Forecast' },
]

function textInputClass() {
  return 'input w-full min-w-[8rem] text-sm'
}

function statusBadgeClass(status: BudgetStatus) {
  if (status === 'published') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
  if (status === 'archived') return 'border-[var(--color-border)]/70 bg-white/[0.04] text-[var(--color-text2)]'
  return 'border-amber-500/40 bg-amber-500/15 text-amber-400'
}

function statusBadge(status: BudgetStatus) {
  return <span className={`badge ${statusBadgeClass(status)}`.trim()}>{STATUS_LABELS[status]}</span>
}

export function BudgetsPage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const canMutate = useCanMutate()
  const { yearIds, setYearIds, isLoadingOptions } = useGlobalFilters()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([])
  const [groupFilterId, setGroupFilterId] = useState('all')
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [budgetDrawerOpen, setBudgetDrawerOpen] = useState(false)
  const [newBudget, setNewBudget] = useState({ companyGroupId: '', year: '2026', name: '', description: '' })

  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false)
  const [newVersion, setNewVersion] = useState({
    name: '',
    type: 'REVISION' as BudgetVersionType,
    baseVersionId: '',
  })

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const companyGroupId = groupFilterId !== 'all' ? groupFilterId : undefined
      const { items } = await budgetsService.listBudgets(companyGroupId ? { companyGroupId } : undefined)
      setBudgets(items)
    } finally {
      setLoading(false)
    }
  }, [groupFilterId])

  useEffect(() => {
    void mastersService.listCompanyGroups().then(setCompanyGroups)
  }, [])

  useEffect(() => {
    if (isLoadingOptions) return
    void loadBudgets()
  }, [isLoadingOptions, loadBudgets])

  const groupNameById = useMemo(() => new Map(companyGroups.map((g) => [g.id, g.name])), [companyGroups])
  const groupOptions: SelectOption[] = useMemo(
    () => companyGroups.filter((g) => g.active).map((g) => ({ value: g.id, label: g.name })),
    [companyGroups],
  )
  const groupFilterOptions: SelectOption[] = useMemo(
    () => [{ value: 'all', label: 'Todos os grupos' }, ...groupOptions],
    [groupOptions],
  )

  const filteredBudgets = useMemo(() => {
    const yearFilter = yearIds.includes('all') ? undefined : Number(yearIds[0])
    if (!yearFilter || Number.isNaN(yearFilter)) return budgets
    return budgets.filter((b) => b.year === yearFilter)
  }, [budgets, yearIds])

  const selectedBudget = useMemo(
    () => filteredBudgets.find((b) => b.id === selectedBudgetId) ?? null,
    [filteredBudgets, selectedBudgetId],
  )

  const baseVersionOptions: SelectOption[] = useMemo(() => {
    if (!selectedBudget) return []
    return [
      { value: '', label: 'Nenhuma (versão em branco)' },
      ...selectedBudget.versions.map((v) => ({
        value: v.id,
        label: `v${selectedBudget.year}.${v.versionNumber} — ${v.name}`,
      })),
    ]
  }, [selectedBudget])

  const handleCreateBudget = async () => {
    const name = newBudget.name.trim()
    const year = Number(newBudget.year)
    if (!newBudget.companyGroupId || !name || !Number.isFinite(year)) {
      toast.push({
        variant: 'error',
        title: 'Campos obrigatórios',
        message: 'Informe grupo de empresas, ano e nome.',
      })
      return
    }
    try {
      const created = await budgetsService.createBudget({
        companyGroupId: newBudget.companyGroupId,
        year,
        name,
        description: newBudget.description.trim() || undefined,
      })
      await loadBudgets()
      setSelectedBudgetId(created.id)
      setBudgetDrawerOpen(false)
      setNewBudget({ companyGroupId: '', year: String(year), name: '', description: '' })
      toast.push({
        variant: 'success',
        title: 'Orçamento criado',
        message: 'A versão original foi gerada automaticamente.',
      })
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Erro ao criar orçamento',
        message: getErrorMessage(err, 'Verifique se o grupo possui empresas cadastradas.'),
      })
    }
  }

  const handlePublishVersion = async (version: BudgetVersionDetail) => {
    if (version.status !== 'draft') return
    try {
      await budgetsService.publish(version.id)
      await loadBudgets()
      toast.push({
        variant: 'success',
        title: 'Versão publicada',
        message: 'O status do orçamento foi atualizado para Publicado.',
      })
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Não foi possível publicar',
        message: getErrorMessage(
          err,
          'Preencha o planejamento da versão antes de publicar (pelo menos uma linha).',
        ),
      })
    }
  }

  const handleCreateVersion = async () => {
    if (!selectedBudget) return
    const name = newVersion.name.trim()
    if (!name) {
      toast.push({ variant: 'error', title: 'Nome obrigatório' })
      return
    }
    try {
      await budgetsService.createVersion(selectedBudget.id, {
        name,
        type: newVersion.type,
        baseVersionId: newVersion.baseVersionId || undefined,
      })
      await loadBudgets()
      setVersionDrawerOpen(false)
      setNewVersion({ name: '', type: 'REVISION', baseVersionId: '' })
      toast.push({ variant: 'success', title: 'Versão criada' })
    } catch {
      toast.push({ variant: 'error', title: 'Erro ao criar versão' })
    }
  }

  const openVersionDrawer = (budget: Budget) => {
    setSelectedBudgetId(budget.id)
    setNewVersion({ name: '', type: 'REVISION', baseVersionId: budget.versions[0]?.id ?? '' })
    setVersionDrawerOpen(true)
  }

  const handleDeleteBudget = async (budget: Budget) => {
    const ok = await confirm({
      title: 'Excluir orçamento',
      description: `O orçamento "${budget.name}" (${budget.year}), todos os lançamentos planejados e os valores realizados vinculados serão removidos permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const result = await budgetsService.deleteBudget(budget.id)
      if (selectedBudgetId === budget.id) setSelectedBudgetId(null)
      await loadBudgets()
      const parts: string[] = []
      if (result.actualsDeleted > 0) parts.push(`${result.actualsDeleted} realizado(s)`)
      if (result.linesDeleted > 0) parts.push(`${result.linesDeleted} lançamento(s) planejado(s)`)
      if (result.versionsDeleted > 0) parts.push(`${result.versionsDeleted} versão(ões)`)
      toast.push({
        variant: 'success',
        title: 'Orçamento excluído',
        message: parts.length ? `${parts.join(', ')} removidos.` : 'Orçamento removido com sucesso.',
      })
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Não foi possível excluir',
        message: getErrorMessage(err, 'Tente novamente em instantes.'),
      })
    }
  }

  const handleDeleteVersion = async (version: BudgetVersionDetail) => {
    if (!selectedBudget) return
    const ok = await confirm({
      title: 'Excluir versão',
      description: `A versão "v${selectedBudget.year}.${version.versionNumber} — ${version.name}" e todos os seus lançamentos serão removidos permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const result = await budgetsService.deleteVersion(version.id)
      await loadBudgets()
      toast.push({
        variant: 'success',
        title: 'Versão excluída',
        message:
          result.linesDeleted > 0
            ? `${result.linesDeleted} lançamento(s) removidos.`
            : 'Versão removida com sucesso.',
      })
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Não foi possível excluir',
        message: getErrorMessage(err, 'Tente novamente em instantes.'),
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description={canMutate ? undefined : 'Visualização somente leitura.'}
        actions={
          canMutate ? (
            <ListPageIncluirButton
              contextLabel="Orçamentos"
              label="Novo orçamento"
              onClick={() => {
                const defaultGroup = groupFilterId !== 'all' ? groupFilterId : companyGroups[0]?.id ?? ''
                const defaultYear = yearIds.includes('all') ? '2026' : (yearIds[0] ?? '2026')
                setNewBudget({ companyGroupId: defaultGroup, year: defaultYear, name: '', description: '' })
                setBudgetDrawerOpen(true)
              }}
            />
          ) : undefined
        }
      />

      <FilterBar>
        <FilterField label="Grupo de empresas">
          <Select
            size="sm"
            value={groupFilterId}
            onChange={(v) => setGroupFilterId(String(v))}
            options={groupFilterOptions}
          />
        </FilterField>
        <FilterField label="Ano">
          <Select
            size="sm"
            value={yearIds.includes('all') ? 'all' : (yearIds[0] ?? '2026')}
            onChange={(v) => setYearIds(v === 'all' ? ['all'] : [String(v)])}
            options={[
              { value: 'all', label: 'Todos os anos' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
              { value: '2027', label: '2027' },
            ]}
          />
        </FilterField>
      </FilterBar>

      <DataTable<Budget>
        rows={loading ? [] : filteredBudgets}
        columns={[
          {
            id: 'group',
            header: 'Grupo de empresas',
            cell: (r) => (
              <span className="text-xs text-[var(--color-text2)]">
                {groupNameById.get(r.companyGroupId) ?? r.companyGroupId}
              </span>
            ),
          },
          {
            id: 'year',
            header: 'Ano',
            width: '80px',
            cell: (r) => <span className="font-mono text-xs">{r.year}</span>,
          },
          {
            id: 'name',
            header: 'Nome',
            cell: (r) => (
              <button
                type="button"
                className="text-left text-[var(--color-text)] hover:underline"
                onClick={() => setSelectedBudgetId((prev) => (prev === r.id ? null : r.id))}
              >
                {r.name}
              </button>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (r) => statusBadge(r.status),
          },
          {
            id: 'versions',
            header: 'Versões',
            width: '90px',
            cell: (r) => <span className="font-mono text-xs">{r.versions.length}</span>,
          },
          {
            id: 'created',
            header: 'Criado em',
            cell: (r) => (
              <span className="font-mono text-xs text-[var(--color-text2)]">{formatDatePt(r.createdAt)}</span>
            ),
          },
          ...(canMutate
            ? [
                {
                  id: 'actions',
                  header: 'Ações',
                  width: '260px',
                  cell: (r: Budget) => (
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" className="btn-table-ghost" onClick={() => openVersionDrawer(r)}>
                        Nova versão
                      </button>
                      <button
                        type="button"
                        className="btn-table-ghost text-red-400 hover:text-red-300"
                        onClick={() => void handleDeleteBudget(r)}
                      >
                        Excluir
                      </button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      {selectedBudget ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[var(--color-text)]">
              Versões — {selectedBudget.name} ({selectedBudget.year})
            </h2>
            {canMutate ? (
              <button type="button" className="btn-toolbar-secondary" onClick={() => openVersionDrawer(selectedBudget)}>
                <Plus className="h-3.5 w-3.5" />
                Nova versão
              </button>
            ) : null}
          </div>
          <DataTable<BudgetVersionDetail>
            rows={selectedBudget.versions}
            dense
            columns={[
              {
                id: 'num',
                header: 'Nº',
                width: '56px',
                cell: (r) => <span className="font-mono text-xs">v{selectedBudget.year}.{r.versionNumber}</span>,
              },
              {
                id: 'name',
                header: 'Nome',
                cell: (r) => <span>{r.name}</span>,
              },
              {
                id: 'type',
                header: 'Tipo',
                width: '110px',
                cell: (r) => <span className="badge">{VERSION_TYPE_LABELS[r.type]}</span>,
              },
              {
                id: 'status',
                header: 'Status',
                width: '110px',
                cell: (r) => statusBadge(r.status),
              },
              {
                id: 'created',
                header: 'Criada em',
                cell: (r) => (
                  <span className="font-mono text-xs text-[var(--color-text2)]">{formatDatePt(r.createdAt)}</span>
                ),
              },
              {
                id: 'plan',
                header: 'Planejamento',
                width: '160px',
                cell: (r) => (
                  <Link
                    to={`/planejamento?versionId=${r.id}`}
                    className="btn-table-ghost inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir grade
                  </Link>
                ),
              },
              ...(canMutate
                ? [
                    {
                      id: 'actions',
                      header: 'Ações',
                      width: '200px',
                      cell: (r: BudgetVersionDetail) => (
                        <div className="flex items-center justify-center gap-2">
                          {r.status === 'draft' ? (
                            <button
                              type="button"
                              className="btn-table-ghost"
                              onClick={() => void handlePublishVersion(r)}
                            >
                              Publicar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-table-ghost text-red-400 hover:text-red-300"
                            onClick={() => void handleDeleteVersion(r)}
                          >
                            Excluir
                          </button>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </section>
      ) : null}

      <Drawer
        open={budgetDrawerOpen}
        title="Novo orçamento"
        onClose={() => setBudgetDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => setBudgetDrawerOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-toolbar-primary" onClick={() => void handleCreateBudget()}>
              Criar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label mb-1">Grupo de empresas</label>
            <Select
              value={newBudget.companyGroupId}
              onChange={(v) => setNewBudget((s) => ({ ...s, companyGroupId: String(v) }))}
              options={groupOptions}
              placeholder="Selecione o grupo"
            />
          </div>
          <div>
            <label className="label mb-1">Ano</label>
            <input
              className={textInputClass()}
              type="number"
              min={2000}
              max={2100}
              value={newBudget.year}
              onChange={(e) => setNewBudget((s) => ({ ...s, year: e.target.value }))}
            />
          </div>
          <div>
            <label className="label mb-1">Nome</label>
            <input
              className={textInputClass()}
              value={newBudget.name}
              onChange={(e) => setNewBudget((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ex.: Orçamento operacional 2026"
            />
          </div>
          <div>
            <label className="label mb-1">Descrição (opcional)</label>
            <input
              className={textInputClass()}
              value={newBudget.description}
              onChange={(e) => setNewBudget((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>
      </Drawer>

      <Drawer
        open={versionDrawerOpen}
        title={selectedBudget ? `Nova versão — ${selectedBudget.name}` : 'Nova versão'}
        onClose={() => setVersionDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => setVersionDrawerOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-toolbar-primary" onClick={() => void handleCreateVersion()}>
              Criar versão
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label mb-1">Nome</label>
            <input
              className={textInputClass()}
              value={newVersion.name}
              onChange={(e) => setNewVersion((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ex.: Revisão Q3"
            />
          </div>
          <div>
            <label className="label mb-1">Tipo</label>
            <Select
              value={newVersion.type}
              onChange={(v) => setNewVersion((s) => ({ ...s, type: v as BudgetVersionType }))}
              options={VERSION_TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="label mb-1">Versão base (opcional)</label>
            <Select
              value={newVersion.baseVersionId}
              onChange={(v) => setNewVersion((s) => ({ ...s, baseVersionId: String(v) }))}
              options={baseVersionOptions}
              placeholder="Nenhuma"
            />
          </div>
        </div>
      </Drawer>
    </div>
  )
}
