import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, InfoCard, SummaryCard, Select, DatePicker } from '@/components/ui'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { actualsService } from '@/services/modules/actuals.service'
import type { ActualEntry, ActualOrigin, ActualRecordStatus } from '@/types/entities'
import { formatBRL } from '@/lib/formatters/currency'
import { formatDatePt } from '@/lib/formatters/date'
import { getErrorMessage } from '@/services/api/errors'
import { useToast } from '@/context/toast-context'
import { useCanMutate } from '@/hooks/useCanMutate'
import type { SelectOption } from '@/components/ui/Select'

const originEditOptions: SelectOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'import', label: 'Importação' },
  { value: 'integracao', label: 'Integração' },
  { value: 'erp', label: 'ERP' },
]

const statusEditOptions: SelectOption[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'validado', label: 'Validado' },
  { value: 'conciliado', label: 'Conciliado' },
]

function textInputClass() {
  return 'input w-full text-sm'
}

export function ActualDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const canMutate = useCanMutate()
  const [row, setRow] = useState<ActualEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ActualEntry | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    void actualsService
      .getById(id)
      .then((r) => alive && setRow(r))
      .catch((e) => alive && setError(getErrorMessage(e)))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    setEditing(false)
    setDraft(null)
  }, [row?.id])

  const startEdit = () => {
    if (!row) return
    setDraft(structuredClone(row))
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
  }

  const saveEdit = () => {
    if (!draft) return
    const description = draft.description.trim()
    if (!description) {
      toast.push({ variant: 'error', title: 'Descrição obrigatória' })
      return
    }
    setRow({ ...draft, description })
    toast.push({ variant: 'success', title: 'Lançamento atualizado', message: 'Alteração aplicada localmente.' })
    setEditing(false)
    setDraft(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhe do lançamento"
        description={canMutate ? 'Visualização somente leitura até Editar; confirme com Salvar.' : 'Visualização somente leitura.'}
        actions={
          <>
            {canMutate && row && !editing ? (
              <button type="button" className="btn-toolbar-secondary" onClick={startEdit}>
                Editar
              </button>
            ) : null}
            {canMutate && row && editing && draft ? (
              <>
                <button type="button" className="btn-toolbar-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
                <button type="button" className="btn-toolbar-primary" onClick={saveEdit}>
                  Salvar
                </button>
              </>
            ) : null}
            <Link to="/realizado" className="btn-toolbar-secondary">
              Voltar
            </Link>
          </>
        }
      />

      {error ? (
        <div className="rounded-[var(--radius-lg)] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!row ? null : editing && draft ? (
        <div className="glass glass-hover space-y-4 rounded-[var(--radius-lg)] p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="label mb-2">Data</div>
              <DatePicker value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            </div>
            <div>
              <div className="label mb-2">Valor</div>
              <CurrencyInput value={draft.amount} onChange={(n) => setDraft({ ...draft, amount: n })} />
            </div>
            <div>
              <div className="label mb-2">Origem</div>
              <Select
                value={draft.origin}
                onChange={(v) => setDraft({ ...draft, origin: v as ActualOrigin })}
                options={originEditOptions}
                placeholder="Origem"
              />
            </div>
            <div>
              <div className="label mb-2">Status</div>
              <Select
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as ActualRecordStatus })}
                options={statusEditOptions}
                placeholder="Status"
              />
            </div>
            <div className="md:col-span-2">
              <div className="label mb-2">Descrição</div>
              <input
                className={textInputClass()}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text2)]">
            IDs de empresa, centro e categoria permanecem como no registro original; ajuste completo virá com a API.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SummaryCard label="Valor" primary={formatBRL(row.amount)} secondary={`Competência ${formatDatePt(row.date)}`} />
          <SummaryCard label="Origem do registro" primary={row.origin} secondary={row.sourceRef ? `Ref: ${row.sourceRef}` : 'Sem ref. externa'} />
          <SummaryCard label="Status" primary={row.status} secondary="Validações aplicadas no backend" />

          <div className="lg:col-span-3">
            <InfoCard title="Descrição">{row.description}</InfoCard>
          </div>
        </div>
      )}
    </div>
  )
}
