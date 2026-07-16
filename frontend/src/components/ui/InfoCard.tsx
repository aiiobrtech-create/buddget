import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function InfoCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('glass glass-hover rounded-[var(--radius-lg)] p-5', className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">{title}</div>
      <div className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{children}</div>
    </div>
  )
}
