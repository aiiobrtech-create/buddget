import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: string
  width?: string
  minWidth?: string
  maxWidth?: string
  cell: (row: T) => ReactNode
}

function columnStyle(c: Pick<Column<unknown>, 'width' | 'minWidth' | 'maxWidth'>) {
  return {
    ...(c.width ? { width: c.width } : {}),
    ...(c.minWidth ? { minWidth: c.minWidth } : {}),
    ...(c.maxWidth ? { maxWidth: c.maxWidth } : {}),
  }
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  stickyHeader,
  dense,
}: {
  columns: Column<T>[]
  rows: T[]
  stickyHeader?: boolean
  dense?: boolean
}) {
  return (
    <div className="table-shell scrollbar-thin">
      <table className="w-max border-collapse text-sm" style={{ minWidth: 'max(100%, 720px)' }}>
        <thead
          className={cn(
            'bg-[var(--color-bg2)]/80 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text2)]',
            stickyHeader && 'sticky top-0 z-10 backdrop-blur-md',
          )}
        >
          <tr>
            {columns.map((c) => (
              <th
                key={c.id}
                className={cn(
                  'border-b border-[var(--color-border)]/80 px-3 py-1 align-middle whitespace-nowrap',
                  dense && 'py-0.5',
                )}
                style={columnStyle(c)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-white/[0.03]">
              {columns.map((c) => (
                <td
                  key={c.id}
                  style={columnStyle(c)}
                  className={cn(
                    'border-b border-[var(--color-border)]/70 px-3 py-1 text-center text-[12px] leading-tight text-[var(--color-text)] align-middle whitespace-nowrap',
                    dense && 'py-0.5',
                  )}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
