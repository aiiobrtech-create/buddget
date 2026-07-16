import { cn } from '@/lib/utils'
import type { BudgetHealth } from '@/types/entities'

const map: Record<
  BudgetHealth,
  { label: string; className: string }
> = {
  ok: {
    label: 'Dentro do orçamento',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  },
  attention: {
    label: 'Atenção',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
  },
  over: {
    label: 'Acima do orçamento',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-100',
  },
}

const revenueOverStyle = {
  label: 'Acima do orçamento',
  className: 'border-sky-500/30 bg-sky-500/15 text-sky-200',
}

export function StatusBadge({
  health,
  className,
  variant = 'default',
}: {
  health: BudgetHealth
  className?: string
  variant?: 'default' | 'revenue'
}) {
  const s = health === 'over' && variant === 'revenue' ? revenueOverStyle : map[health]
  return <span className={cn('badge', s.className, className)}>{s.label}</span>
}
