import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabsCtx {
  value: string
  setValue: (v: string) => void
}

const Ctx = createContext<TabsCtx | null>(null)

export function Tabs({ defaultValue, value, onValueChange, children }: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
}) {
  const [inner, setInner] = useState(defaultValue ?? '')
  const controlled = value !== undefined
  const v = controlled ? (value as string) : inner
  const setValue = (nv: string) => {
    if (!controlled) setInner(nv)
    onValueChange?.(nv)
  }
  const memo = useMemo(() => ({ value: v, setValue }), [v, setValue])
  return <Ctx.Provider value={memo}>{children}</Ctx.Provider>
}

export function TabList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg3)]/40 p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TabTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('TabTrigger fora de Tabs')
  const active = ctx.value === value
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn(
        'rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-[var(--color-bg4)] text-[var(--color-text)] shadow-sm'
          : 'text-[var(--color-text2)] hover:text-[var(--color-text)]',
      )}
    >
      {children}
    </button>
  )
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('TabPanel fora de Tabs')
  if (ctx.value !== value) return null
  return <div className="mt-4">{children}</div>
}
