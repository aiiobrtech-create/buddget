import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  PageHeader,
  SummaryCard,
  DataTable,
  Tabs,
  TabList,
  TabTrigger,
  TabPanel,
  Drawer,
  GlobalFilterBar,
  Select,
} from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { forecastsService } from '@/services/modules/forecasts.service'
import { budgetsService } from '@/services/modules/budgets.service'
import type { ForecastRevision } from '@/types/entities'
import { formatBRL } from '@/lib/formatters/currency'
import { formatDatePt } from '@/lib/formatters/date'
import { FORECAST_CONCEPT } from '@/lib/forecast/year-end-projection'
import { useToast } from '@/context/toast-context'
import { useGlobalFilters } from '@/context/global-filters-context'
import { getErrorMessage } from '@/services/api/errors'
import { useCanMutate } from '@/hooks/useCanMutate'

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function varianceLabel(forecast: number, budget: number) {
  const diff = forecast - budget
  const pct = budget !== 0 ? (diff / budget) * 100 : 0
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${formatBRL(diff)} (${sign}${pct.toFixed(1)}%) vs orçamento`
}

export function ForecastPage() {
  const toast = useToast()
  const canMutate = useCanMutate()
  const { yearIds, monthIds, effectiveCompanyIds, selectedVersionId } = useGlobalFilters()
  const [items, setItems] = useState<ForecastRevision[]>([])
  const [versionOptions, setVersionOptions] = useState<SelectOption[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForecast, setNewForecast] = useState({ label: '', baseVersionId: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<ForecastRevision | null>(null)

  const defaultBaseVersionId = useMemo(() => {
    if (selectedVersionId) return selectedVersionId
    return versionOptions[0]?.value ?? ''
  }, [selectedVersionId, versionOptions])

  const versionLabelById = useMemo(
    () => new Map(versionOptions.map((option) => [option.value, option.label])),
    [versionOptions],
  )

  const loadItems = useCallback(async () => {
    try {
      const result = await forecastsService.list({ yearIds, monthIds, companyIds: effectiveCompanyIds })
      setItems(result.items)
    } catch (error) {
      toast.push({
        variant: 'error',
        title: 'Erro ao carregar previsões',
        message: getErrorMessage(error),
      })
    }
  }, [yearIds, monthIds, effectiveCompanyIds, toast])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    void budgetsService.listVersions().then((result) => {
      const filtered = (effectiveCompanyIds
        ? result.items.filter((version) => effectiveCompanyIds.includes(version.companyId))
        : result.items
      ).filter((version) => version.type !== 'FORECAST')
      setVersionOptions(
        filtered.map((version) => ({
          value: version.id,
          label: version.label,
        })),
      )
    })
  }, [effectiveCompanyIds])

  const openNewForecastDrawer = () => {
    setNewForecast({
      label: '',
      baseVersionId: defaultBaseVersionId,
    })
    setDrawerOpen(true)
  }

  const headline = items[0] ?? null

  const saveRow = async () => {
    if (!editDraft) return
    const label = editDraft.label.trim()
    const baseVersionId = editDraft.baseVersionId.trim()
    if (!label || !baseVersionId) {
      toast.push({ variant: 'error', title: 'Nome e versão base são obrigatórios' })
      return
    }
    if (!Number.isFinite(editDraft.totals.forecast)) {
      toast.push({ variant: 'error', title: 'Previsão de fechamento inválida' })
      return
    }

    setSaving(true)
    try {
      await forecastsService.updateForecast(editDraft.id, {
        label,
        baseVersionId,
        forecastAmount: editDraft.totals.forecast,
      })
      await loadItems()
      toast.push({ variant: 'success', title: 'Previsão atualizada' })
      setEditOpen(false)
      setEditDraft(null)
    } catch (error) {
      toast.push({
        variant: 'error',
        title: 'Erro ao salvar previsão',
        message: getErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRow = async () => {
    if (!editDraft) return
    setSaving(true)
    try {
      await forecastsService.deleteForecast(editDraft.id)
      await loadItems()
      toast.push({ variant: 'success', title: 'Registro excluído' })
      setEditOpen(false)
      setEditDraft(null)
    } catch (error) {
      toast.push({
        variant: 'error',
        title: 'Erro ao excluir previsão',
        message: getErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateForecast = async () => {
    if (!newForecast.label.trim() || !newForecast.baseVersionId.trim()) {
      toast.push({ variant: 'error', title: 'Dados obrigatórios', message: 'Preencha nome e versão base.' })
      return
    }

    setCreating(true)
    try {
      await forecastsService.createForecast({
        label: newForecast.label.trim(),
        baseVersionId: newForecast.baseVersionId,
      })
      await loadItems()
      toast.push({ variant: 'success', title: 'Previsão incluída' })
      setDrawerOpen(false)
      setNewForecast({ label: '', baseVersionId: defaultBaseVersionId })
    } catch (error) {
      toast.push({
        variant: 'error',
        title: 'Erro ao criar previsão',
        message: getErrorMessage(error),
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecast"
        description={canMutate ? undefined : 'Visualização somente leitura.'}
        actions={
          canMutate ? (
            <button type="button" className="btn-toolbar-primary" onClick={openNewForecastDrawer}>
              <TrendingUp className="h-3.5 w-3.5" />
              Nova previsão
            </button>
          ) : undefined
        }
      />

      <GlobalFilterBar />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {headline ? (
          <>
            <SummaryCard
              label="Realizado acumulado"
              primary={formatBRL(headline.projection.actualYtd)}
              secondary={`${headline.projection.monthsClosed} mês(es) fechado(s)`}
            />
            <SummaryCard
              label="Previsão de fechamento"
              primary={formatBRL(headline.totals.forecast)}
              secondary={varianceLabel(headline.totals.forecast, headline.totals.original)}
            />
            <SummaryCard
              label="Orçamento anual"
              primary={formatBRL(headline.totals.original)}
              secondary={`Ritmo real: ${formatPct(headline.projection.runRateRatio)} do orçado YTD`}
            />
          </>
        ) : null}
      </div>

      <Tabs defaultValue="compare">
        <TabList>
          <TabTrigger value="compare">Cenários de previsão</TabTrigger>
          <TabTrigger value="history">Histórico</TabTrigger>
        </TabList>

        <TabPanel value="compare">
          <DataTable<ForecastRevision>
            rows={items}
            columns={[
              {
                id: 'l',
                header: 'Cenário',
                cell: (r) => (
                  <span className="text-[var(--color-text)]" title={r.label}>
                    {r.label}
                  </span>
                ),
              },
              {
                id: 'ytd',
                header: 'Realizado YTD',
                width: '140px',
                cell: (r) => (
                  <span className="font-mono text-xs text-[var(--color-text)]">{formatBRL(r.projection.actualYtd)}</span>
                ),
              },
              {
                id: 'o',
                header: 'Orçamento anual',
                width: '140px',
                cell: (r) => (
                  <span className="font-mono text-xs text-[var(--color-text)]">{formatBRL(r.totals.original)}</span>
                ),
              },
              {
                id: 'fc',
                header: 'Previsão ano',
                width: '140px',
                cell: (r) => (
                  <span className="font-mono text-xs font-semibold text-[var(--color-text)]">
                    {formatBRL(r.totals.forecast)}
                  </span>
                ),
              },
              {
                id: 'bv',
                header: 'Versão base',
                width: '180px',
                cell: (r) => (
                  <span className="text-xs text-[var(--color-text2)]" title={r.baseVersionId}>
                    {versionLabelById.get(r.baseVersionId) ?? r.baseVersionId}
                  </span>
                ),
              },
              {
                id: 'by',
                header: 'Responsável',
                cell: (r) => <span className="text-xs text-[var(--color-text2)]">{r.createdBy}</span>,
              },
              ...(canMutate
                ? [
                    {
                      id: 'act',
                      header: 'Ações',
                      width: '132px',
                      cell: (r: ForecastRevision) => (
                        <button
                          type="button"
                          className="btn-table-ghost shrink-0 whitespace-nowrap"
                          onClick={() => {
                            setEditDraft(structuredClone(r))
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
        </TabPanel>

        <TabPanel value="history">
          <div className="grid gap-3">
            {items.map((r) => (
              <div key={r.id} className="glass glass-hover rounded-[var(--radius-lg)] p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{r.label}</div>
                    <div className="mt-1 text-xs text-[var(--color-text2)]">
                      {r.createdBy} · {formatDatePt(r.createdAt)} · base{' '}
                      {versionLabelById.get(r.baseVersionId) ?? r.baseVersionId}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-[var(--color-text2)]">{r.projection.methodology}</p>
                  </div>
                  <div className="text-right font-mono text-xs text-[var(--color-text)]">
                    <div>YTD {formatBRL(r.projection.actualYtd)}</div>
                    <div className="mt-1 font-semibold">Fechamento {formatBRL(r.totals.forecast)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabPanel>
      </Tabs>

      <Drawer
        open={drawerOpen}
        title="Nova previsão"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => void handleCreateForecast()}
              disabled={creating || !versionOptions.length}
            >
              {creating ? 'Criando…' : 'Criar previsão'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-[var(--color-text2)]">{FORECAST_CONCEPT}</p>
          <div>
            <label className="label mb-1">Nome do cenário</label>
            <input
              className="input w-full"
              value={newForecast.label}
              onChange={(e) => setNewForecast({ ...newForecast, label: e.target.value })}
              placeholder="Ex: Consolidado 2026"
            />
          </div>
          <div>
            <label className="label mb-1">Versão orçamentária base</label>
            <Select
              value={newForecast.baseVersionId}
              onChange={(value) => setNewForecast({ ...newForecast, baseVersionId: value })}
              options={versionOptions}
              placeholder="Selecione a versão base…"
            />
            {!versionOptions.length ? (
              <p className="mt-1.5 text-[11px] text-[var(--color-text2)]">
                Nenhuma versão orçamentária disponível para os filtros atuais.
              </p>
            ) : null}
          </div>
        </div>
      </Drawer>

      <Drawer
        open={editOpen}
        title="Editar previsão"
        onClose={() => {
          setEditOpen(false)
          setEditDraft(null)
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
            <div>
              <label className="label mb-1">Nome do cenário</label>
              <input
                className="input w-full"
                value={editDraft.label}
                onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1">Versão orçamentária base</label>
              <Select
                value={editDraft.baseVersionId}
                onChange={(value) => setEditDraft({ ...editDraft, baseVersionId: value })}
                options={versionOptions}
                placeholder="Selecione a versão base…"
              />
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg2)]/40 p-4 text-xs text-[var(--color-text2)]">
              <div className="font-medium text-[var(--color-text)]">Base de cálculo</div>
              <p className="mt-2 leading-relaxed">{editDraft.projection.methodology}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt>Realizado YTD</dt>
                  <dd className="font-mono text-[var(--color-text)]">{formatBRL(editDraft.projection.actualYtd)}</dd>
                </div>
                <div>
                  <dt>Restante projetado</dt>
                  <dd className="font-mono text-[var(--color-text)]">
                    {formatBRL(editDraft.projection.projectedRemaining)}
                  </dd>
                </div>
                <div>
                  <dt>Orçamento anual</dt>
                  <dd className="font-mono text-[var(--color-text)]">{formatBRL(editDraft.totals.original)}</dd>
                </div>
                <div>
                  <dt>Ritmo vs orçado</dt>
                  <dd className="font-mono text-[var(--color-text)]">{formatPct(editDraft.projection.runRateRatio)}</dd>
                </div>
              </dl>
            </div>

            <div>
              <label className="label mb-1">Previsão de fechamento do ano</label>
              <CurrencyInput
                value={editDraft.totals.forecast}
                onChange={(n) => setEditDraft({ ...editDraft, totals: { ...editDraft.totals, forecast: n } })}
              />
              <p className="mt-1.5 text-[11px] text-[var(--color-text2)]">
                Ajuste manual para refletir imprevistos ou premissas adicionais sobre o fechamento anual.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
