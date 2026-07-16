import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

type MenuPosition = { top: number; left: number; width: number }

function readMenuPosition(trigger: HTMLButtonElement): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  return {
    top: rect.bottom + 8,
    left: rect.left,
    width: Math.max(rect.width, 160),
  }
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecione…',
  className,
  size = 'md',
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [, setTick] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedLabel = useMemo(() => {
    const opt = options.find((o) => o.value === value)
    return opt?.label ?? ''
  }, [value, options])

  useEffect(() => {
    if (!open) return
    const reposition = () => setTick((n) => n + 1)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  const menuPosition = open && triggerRef.current ? readMenuPosition(triggerRef.current) : null

  const menu =
    open && menuPosition
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] cursor-default bg-transparent"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[110] max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg2)] p-1.5 shadow-2xl scrollbar-thin"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              {placeholder ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition hover:bg-white/5',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                    !value && 'bg-white/[0.04]',
                  )}
                >
                  <span className="text-[var(--color-muted)]">{placeholder}</span>
                  {!value ? <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" /> : null}
                </button>
              ) : null}
              {options.map((o) => {
                const active = o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition hover:bg-white/5',
                      size === 'sm' ? 'text-xs' : 'text-sm',
                      active && 'bg-white/[0.04]',
                    )}
                  >
                    <span className="text-[var(--color-text)]">{o.label}</span>
                    {active ? <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" /> : null}
                  </button>
                )
              })}
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((current) => !current)
        }}
        className={cn(
          'input flex w-full min-w-0 items-center justify-between gap-1.5 overflow-hidden text-left font-medium',
          size === 'sm' ? 'px-2 py-1.5 text-xs' : 'pr-10',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !selectedLabel && 'text-[var(--color-muted)]',
          )}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-[var(--color-muted)] transition-transform',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
            open && 'rotate-180',
          )}
        />
      </button>
      {menu}
    </div>
  )
}
