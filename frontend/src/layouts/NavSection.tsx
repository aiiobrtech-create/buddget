import type { ReactNode } from 'react'

export function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
