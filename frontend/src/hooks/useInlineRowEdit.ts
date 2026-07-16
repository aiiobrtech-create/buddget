import { useCallback, useState } from 'react'

/** Edição inline estilo grade: uma linha por vez, com buffer até Salvar/Cancelar. */
export function useInlineRowEdit<T extends { id: string }>() {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<T | null>(null)

  const startEdit = useCallback((row: T) => {
    setEditingRowId(row.id)
    setEditBuffer(structuredClone(row) as T)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingRowId(null)
    setEditBuffer(null)
  }, [])

  const isEditing = useCallback(
    (row: T) => editingRowId === row.id && editBuffer?.id === row.id,
    [editingRowId, editBuffer],
  )

  const busyElsewhere = useCallback(
    (row: T) => editingRowId !== null && editingRowId !== row.id,
    [editingRowId],
  )

  return { editBuffer, setEditBuffer, startEdit, cancelEdit, isEditing, busyElsewhere }
}
