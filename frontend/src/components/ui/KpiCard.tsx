import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { KpiAutoFitValue } from './KpiAutoFitValue'

export function KpiCard({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  hint?: string
  trend?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn('glass glass-hover section-shell relative min-h-0 min-w-0 overflow-hidden', className)}
    >
      <div className="kpi-card-glow pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-brand)]/10 blur-2xl" />
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)]">{label}</div>
      <div className="mt-3 min-w-0 w-full">
        <KpiAutoFitValue className="text-[var(--color-text)]">{value}</KpiAutoFitValue>
      </div>
      {hint ? <div className="mt-2 text-xs leading-snug text-[var(--color-text2)]">{hint}</div> : null}
      {trend ? <div className="mt-3 min-w-0 flex flex-wrap">{trend}</div> : null}
    </motion.div>
  )
}
