import { useState } from 'react'

export function InlineRowActionCell({
  editing,
  busyElsewhere,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  editing: boolean
  busyElsewhere: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (editing) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button type="button" className="btn-table-primary" onClick={onSave}>
          Salvar
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn-table-secondary border-red-500/20 text-red-600 hover:border-red-500 hover:bg-red-50"
            onClick={() => {
              if (confirmDelete) {
                onDelete()
                setConfirmDelete(false)
              } else {
                setConfirmDelete(true)
              }
            }}
            onMouseLeave={() => setConfirmDelete(false)}
          >
            {confirmDelete ? 'Confirmar?' : 'Excluir'}
          </button>
        )}
        <button
          type="button"
          className="btn-table-secondary"
          onClick={() => {
            setConfirmDelete(false)
            onCancel()
          }}
        >
          Cancelar
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      className="btn-table-ghost"
      disabled={busyElsewhere}
      title={busyElsewhere ? 'Termine a edição da outra linha antes.' : undefined}
      onClick={onEdit}
    >
      Editar
    </button>
  )
}
