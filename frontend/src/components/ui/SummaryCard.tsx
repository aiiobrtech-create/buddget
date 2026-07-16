import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SummaryCard({
  label,
  primary,
  secondary,
  className,
}: {
  label: string
  primary: ReactNode
  secondary?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('glass glass-hover rounded-[var(--radius-lg)] p-5', className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">{label}</div>
      <div className="kpi mt-2 text-2xl text-[var(--color-text)]">{primary}</div>
      {secondary ? <div className="mt-2 text-xs text-[var(--color-text2)]">{secondary}</div> : null}
    </div>
  )
}
