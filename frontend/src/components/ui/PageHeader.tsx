import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text2)]">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end md:w-auto md:flex-nowrap md:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
