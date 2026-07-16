import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SelectOption } from './Select'

export function MultiSelect({
  values,
  onChange,
  options,
  placeholder = 'Selecionar…',
  className,
  size = 'md',
  selectionMode = 'multiple',
  emptyMessage = 'Nenhum registro disponível',
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  selectionMode?: 'multiple' | 'single'
  emptyMessage?: string
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const label = useMemo(() => {
    if (values.length === 0) return placeholder
    const map = new Map(options.map((o) => [o.value, o.label]))
    return values.map((v) => map.get(v) ?? v).join(', ')
  }, [values, options, placeholder])

  const toggle = (v: string) => {
    if (selectionMode === 'single') {
      if (v === 'all') {
        onChange(['all'])
      } else if (values.length === 1 && values[0] === v) {
        onChange(['all'])
      } else {
        onChange([v])
      }
      setOpen(false)
      return
    }

    if (values.includes(v)) onChange(values.filter((x) => x !== v))
    else onChange([...values, v])
  }

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const maxHeight = Math.max(160, Math.min(320, window.innerHeight - rect.bottom - viewportPadding))
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      minWidth: rect.width,
      maxWidth: Math.max(rect.width, 280),
      maxHeight,
      zIndex: 120,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updateMenuPosition()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg2)] p-2 shadow-2xl scrollbar-thin"
          >
            {options.length === 0 ? (
              <div className="px-2 py-2 text-sm text-[var(--color-text2)]">{emptyMessage}</div>
            ) : (
              options.map((o) => {
                const active = values.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(o.value)}
                    className="flex w-full min-w-[9rem] items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-white/5"
                  >
                    <span className="text-[var(--color-text)]">{o.label}</span>
                    {active ? <Check className="h-4 w-4 text-[var(--color-accent)]" /> : null}
                  </button>
                )
              })
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'input flex w-full min-w-0 items-center justify-between gap-1.5 overflow-hidden text-left',
          size === 'sm' && 'px-2 py-1.5 text-xs',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', values.length === 0 && 'text-[var(--color-muted)]')}>{label}</span>
        <ChevronsUpDown className={cn('shrink-0 text-[var(--color-muted)]', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      </button>
      {menu}
    </div>
  )
}
