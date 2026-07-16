import { Clock } from 'lucide-react'
import { formatDateTimePt } from '@/lib/formatters/date'
import { cn } from '@/lib/utils'

export interface AuditTimelineItem {
  at: string
  label: string
  actor: string
}

export function AuditTimeline({ items, className }: { items: AuditTimelineItem[]; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--color-border)]" />
      <ul className="space-y-4">
        {items.map((it, idx) => (
          <li key={`${it.at}-${idx}`} className="relative pl-8">
            <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg3)] text-[var(--color-muted)]">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg3)]/35 p-3">
              <div className="text-xs font-semibold text-[var(--color-text)]">{it.label}</div>
              <div className="mt-1 text-[11px] text-[var(--color-text2)]">
                {it.actor} · {formatDateTimePt(it.at)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
