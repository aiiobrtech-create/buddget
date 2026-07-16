import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Download } from 'lucide-react'
import {
  PageHeader,
  DatePicker,
  DataTable,
  Drawer,
  GlobalFilterBar,
} from '@/components/ui'
import { PlanningMasterFields } from '@/components/planning/PlanningMasterFields'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { actualsService } from '@/services/modules/actuals.service'
import { mastersService } from '@/services/modules/masters.service'
import type { ActualEntry, BudgetItem, Category, Company, CompanyGroup, CostCenter, LedgerClass } from '@/types/entities'
import {
  resolvePlanningLineCodeFromMasters,
  resolvePlanningRowSelection,
  type PlanningLineMasters,
  type PlanningRowSelection,
} from '@/lib/codes/planning-line'
import { formatBRL } from '@/lib/formatters/currency'
import { formatDatePt } from '@/lib/formatters/date'
import { useToast } from '@/context/toast-context'
import { useGlobalFilters } from '@/context/global-filters-context'
import { useCanMutate } from '@/hooks/useCanMutate'
import { getErrorMessage } from '@/services/api/errors'
import { downloadActualImportTemplate } from '@/lib/actual-import-template'

const originLabels: Record<string, string> = {
  manual: 'Manual',
  import: 'Importação',
  integracao: 'Integração',
  erp: 'ERP',
}

function originLabel(value: string) {
  return originLabels[value] ?? value
}

const EMPTY_SELECTION: PlanningRowSelection = {
  companyId: '',
  classId: '',
  categoryId: '',
  costCenterId: '',
  itemId: '',
}

function isSelectionComplete(selection: PlanningRowSelection) {
  return Boolean(
    selection.companyId && selection.classId && selection.categoryId && selection.costCenterId && selection.itemId,
  )
}

function PlanningCodePreview({ selection, masters }: { selection: PlanningRowSelection; masters: PlanningLineMasters }) {
  if (!isSelectionComplete(selection)) return null
  const code = resolvePlanningLineCodeFromMasters(
    {
      companyId: selection.companyId,
      classId: selection.classId,
      categoryId: selection.categoryId,
      costCenterId: selection.costCenterId,
      itemId: selection.itemId,
    },
    masters,
  )
  if (code === '—') return null
  return (
    <div>
      <label className="label mb-1">Código orçamentário</label>
      <div className="input flex items-center bg-[var(--color-bg2)]/40 font-mono text-[11px] text-[var(--color-text)]">
        {code}
      </div>
    </div>
  )
}

export function ActualsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const canMutate = useCanMutate()
  const {
    effectiveCompanyIds,
    classIds,
    ccIds,
    categoryIds,
    yearIds,
    monthIds,
    budgetIds,
    isLoadingOptions,
  } = useGlobalFilters()
  const [rows, setRows] = useState<ActualEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<ActualEntry | null>(null)
  const [newEntry, setNewEntry] = useState<Partial<ActualEntry>>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: 0,
  })
  const [newSelection, setNewSelection] = useState<PlanningRowSelection>(EMPTY_SELECTION)
  const [editSelection, setEditSelection] = useState<PlanningRowSelection>(EMPTY_SELECTION)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void mastersService.listCompanies().then(setCompanies)
    void mastersService.listCompanyGroups().then(setCompanyGroups)
    void mastersService.listCostCenters().then(setCostCenters)
    void mastersService.listCategories().then(setCategories)
    void mastersService.listClasses().then(setClasses)
    void mastersService.listBudgetItems().then(setBudgetItems)
  }, [])

  const planningMasters = useMemo(
    () => ({ companies, companyGroups, costCenters, categories, classes, budgetItems }),
    [companies, companyGroups, costCenters, categories, classes, budgetItems],
  )

  const applySelectionToEntry = (selection: PlanningRowSelection) => ({
    companyId: selection.companyId,
    classId: selection.classId,
    categoryId: selection.categoryId,
    costCenterId: selection.costCenterId,
    budgetItemId: selection.itemId,
  })

  const resolveLineCode = (row: ActualEntry) =>
    resolvePlanningLineCodeFromMasters(
      {
        companyId: row.companyId,
        costCenterId: row.costCenterId,
        categoryId: row.categoryId,
        classId: row.classId,
        itemId: row.budgetItemId,
      },
      planningMasters,
    )

  const listQuery = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      yearIds,
      monthIds,
      companyIds: effectiveCompanyIds,
      classIds,
      ccIds,
      categoryIds,
    }),
    [yearIds, monthIds, effectiveCompanyIds, classIds, ccIds, categoryIds],
  )

  const loadRows = useCallback(async () => {
    const r = await actualsService.list(listQuery)
    setRows(r.items)
  }, [listQuery])

  useEffect(() => {
    if (isLoadingOptions) return

    const ac = new AbortController()
    void actualsService
      .list({ ...listQuery, signal: ac.signal })
      .then((r) => setRows(r.items))
      .catch(() => {})

    return () => ac.abort()
  }, [listQuery, isLoadingOptions])

  const handleCreate = async () => {
    if (!isSelectionComplete(newSelection)) {
      toast.push({
        variant: 'error',
        title: 'Dados incompletos',
        message: 'Selecione empresa, classe, categoria, centro de custo e item.',
      })
      return
    }
    if (!newEntry.description?.trim()) {
      toast.push({ variant: 'error', title: 'Descrição obrigatória' })
      return
    }
    if (newEntry.amount === undefined || !Number.isFinite(newEntry.amount)) {
      toast.push({ variant: 'error', title: 'Valor inválido' })
      return
    }

    setSaving(true)
    try {
      const budgetId = budgetIds.includes('all') ? undefined : budgetIds[0]
      await actualsService.create({
        date: newEntry.date || new Date().toISOString().slice(0, 10),
        ...applySelectionToEntry(newSelection),
        budgetId,
        description: newEntry.description.trim(),
        amount: newEntry.amount || 0,
        origin: 'manual',
        status: 'pendente',
      })
      toast.push({ variant: 'success', title: 'Lançamento incluído', message: 'Registro salvo no servidor.' })
      setOpen(false)
      setNewSelection(EMPTY_SELECTION)
      setNewEntry({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        amount: 0,
      })
      await loadRows()
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Erro ao salvar',
        message: getErrorMessage(err, 'Não foi possível gravar o lançamento.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const saveRow = async () => {
    if (!editDraft) return
    if (!isSelectionComplete(editSelection)) {
      toast.push({
        variant: 'error',
        title: 'Dados incompletos',
        message: 'Selecione empresa, classe, categoria, centro de custo e item.',
      })
      return
    }
    const description = editDraft.description.trim()
    if (!description) {
      toast.push({ variant: 'error', title: 'Descrição obrigatória' })
      return
    }
    if (!Number.isFinite(editDraft.amount)) {
      toast.push({ variant: 'error', title: 'Valor inválido' })
      return
    }

    setSaving(true)
    try {
      await actualsService.update(editDraft.id, {
        date: editDraft.date,
        ...applySelectionToEntry(editSelection),
        description,
        amount: editDraft.amount,
        origin: editDraft.origin,
        status: editDraft.status,
        sourceRef: editDraft.sourceRef,
        budgetId: editDraft.budgetId,
      })
      toast.push({ variant: 'success', title: 'Lançamento atualizado' })
      setEditOpen(false)
      setEditDraft(null)
      await loadRows()
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Erro ao salvar',
        message: getErrorMessage(err, 'Não foi possível atualizar o lançamento.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRow = async () => {
    if (!editDraft) return

    setSaving(true)
    try {
      await actualsService.delete(editDraft.id)
      toast.push({ variant: 'success', title: 'Lançamento excluído' })
      setEditOpen(false)
      setEditDraft(null)
      await loadRows()
    } catch (err) {
      toast.push({
        variant: 'error',
        title: 'Erro ao excluir',
        message: getErrorMessage(err, 'Não foi possível excluir o lançamento.'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Realizado"
        description={
          canMutate
            ? 'Edite ou exclua lançamentos pelo drawer; as alterações são gravadas no servidor.'
            : 'Visualização somente leitura.'
        }
        actions={
          canMutate ? (
            <>
              <button
                type="button"
                className="btn-toolbar-secondary"
                onClick={() => {
                  setNewSelection(EMPTY_SELECTION)
                  setNewEntry({
                    date: new Date().toISOString().slice(0, 10),
                    description: '',
                    amount: 0,
                  })
                  setOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Incluir
              </button>
              <button type="button" className="btn-toolbar-secondary" onClick={() => downloadActualImportTemplate()}>
                <Download className="h-3.5 w-3.5" />
                Baixar modelo
              </button>
              <button type="button" className="btn-toolbar-primary" onClick={() => nav('/realizado/importacao')}>
                Importação em lote
              </button>
            </>
          ) : undefined
        }
      />

      <GlobalFilterBar />

      <DataTable<ActualEntry>
        stickyHeader
        rows={rows}
        columns={[
          {
            id: 'code',
            header: 'Código',
            width: '220px',
            cell: (r) => (
              <span className="font-mono text-[11px] text-[var(--color-text)]" title={resolveLineCode(r)}>
                {resolveLineCode(r)}
              </span>
            ),
          },
          {
            id: 'dt',
            header: 'Data',
            width: '140px',
            cell: (r) => <span className="font-mono text-xs text-[var(--color-text)]">{formatDatePt(r.date)}</span>,
          },
          {
            id: 'd',
            header: 'Descrição',
            cell: (r) => <span className="text-[var(--color-text)]">{r.description}</span>,
          },
          {
            id: 'a',
            header: 'Valor',
            width: '160px',
            cell: (r) => <span className="font-mono text-xs font-semibold text-[var(--color-text)]">{formatBRL(r.amount)}</span>,
          },
          {
            id: 'o',
            header: 'Origem',
            width: '140px',
            cell: (r) => <span className="badge">{r.origin}</span>,
          },
          ...(canMutate
            ? [
                {
                  id: 'x',
                  header: 'Ações',
                  width: '200px',
                  cell: (r: ActualEntry) => (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                                itemId: draft.budgetItemId,
                              },
                              planningMasters,
                            ),
                          )
                          setEditOpen(true)
                        }}
                      >
                        Editar
                      </button>
                      <Link className="btn-table-ghost shrink-0 whitespace-nowrap" to={`/realizado/${r.id}`}>
                        Detalhe
                      </Link>
                    </div>
                  ),
                },
              ]
            : [
                {
                  id: 'x',
                  header: 'Ações',
                  width: '120px',
                  cell: (r: ActualEntry) => (
                    <Link className="btn-table-ghost shrink-0 whitespace-nowrap" to={`/realizado/${r.id}`}>
                      Detalhe
                    </Link>
                  ),
                },
              ]),
        ]}
      />

      <Drawer
        open={open}
        title="Novo lançamento manual"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-toolbar-primary"
              disabled={saving}
              onClick={() => void handleCreate()}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <PlanningMasterFields
            selection={newSelection}
            onSelectionChange={setNewSelection}
            companies={companies}
            classes={classes}
            categories={categories}
            costCenters={costCenters}
            budgetItems={budgetItems}
          />
          <PlanningCodePreview selection={newSelection} masters={planningMasters} />
          <div>
            <label className="label mb-1">Data</label>
            <DatePicker value={newEntry.date!} onChange={(v) => setNewEntry({ ...newEntry, date: v })} />
          </div>
          <div>
            <label className="label mb-1">Descrição</label>
            <input
              className="input w-full"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label mb-1">Valor</label>
            <CurrencyInput value={newEntry.amount!} onChange={(v) => setNewEntry({ ...newEntry, amount: v })} />
          </div>
          <div>
            <label className="label mb-1">Origem</label>
            <div className="input flex items-center bg-[var(--color-bg2)]/40 text-[var(--color-text2)]">{originLabel('manual')}</div>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={editOpen}
        title="Editar lançamento"
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
              }}
            >
              Cancelar
            </button>
            <button type="button" className="btn-toolbar-secondary" onClick={() => void handleDeleteRow()} disabled={!editDraft || saving}>
              Excluir
            </button>
            <button type="button" className="btn-toolbar-primary" onClick={() => void saveRow()} disabled={!editDraft || saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        }
      >
        {!editDraft ? null : (
          <div className="space-y-4">
            <PlanningMasterFields
              selection={editSelection}
              onSelectionChange={setEditSelection}
              companies={companies}
              classes={classes}
              categories={categories}
              costCenters={costCenters}
              budgetItems={budgetItems}
            />
            <PlanningCodePreview selection={editSelection} masters={planningMasters} />
            <div>
              <label className="label mb-1">Data</label>
              <DatePicker value={editDraft.date} onChange={(v) => setEditDraft({ ...editDraft, date: v })} />
            </div>
            <div>
              <label className="label mb-1">Descrição</label>
              <input
                className="input w-full"
                value={editDraft.description}
                onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1">Valor</label>
              <CurrencyInput value={editDraft.amount} onChange={(n) => setEditDraft({ ...editDraft, amount: n })} />
            </div>
            <div>
              <label className="label mb-1">Origem</label>
              <div className="input flex items-center bg-[var(--color-bg2)]/40 text-[var(--color-text2)]">{originLabel(editDraft.origin)}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
