import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const filterFieldClass = 'min-w-[7.5rem] shrink-0'
export const filterLabelClass =
  'mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text2)]'

export function FilterField({
  label,
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(filterFieldClass, className)}>
      {label ? <div className={filterLabelClass}>{label}</div> : null}
      {children}
    </div>
  )
}

export function FilterBar({
  children,
  className,
  compact = true,
  top,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
  top?: ReactNode
}) {
  if (compact) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg3)]/35 p-3 overflow-visible relative z-20',
          className,
        )}
      >
        {top ? <div className="mb-2 min-w-0">{top}</div> : null}
        <div className="flex min-w-0 flex-wrap items-end gap-2">{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg3)]/35 p-4 md:p-5',
        className,
      )}
    >
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 gap-x-4 gap-y-5',
          'sm:grid-cols-2',
          'lg:grid-cols-3',
          'xl:grid-cols-4',
        )}
      >
        {children}
      </div>
    </div>
  )
}
