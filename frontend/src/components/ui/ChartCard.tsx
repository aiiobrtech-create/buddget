import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('glass glass-hover min-w-0 rounded-[var(--radius-lg)] p-4 md:p-5', className)}>
      <div className="mb-3 flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--color-text2)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="dashboard-chart-slot relative h-[min(38vw,200px)] w-full min-h-[160px] min-w-0 sm:h-[200px] md:h-[min(24vh,240px)] md:min-h-[180px] lg:h-[220px]">
        {children}
      </div>
    </div>
  )
}
