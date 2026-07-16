import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchInput } from '@/components/ui'
import type { PlanningLineOption } from '@/lib/codes/planning-line'

type MenuPosition = { top: number; left: number; width: number }

function readMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  return { top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 280) }
}

export function PlanningLineCodeField({
  value,
  onChange,
  onClear,
  options,
}: {
  value: string
  onChange: (option: PlanningLineOption) => void
  onClear?: () => void
  options: PlanningLineOption[]
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find((o) => o.code === value), [options, value])

  useEffect(() => {
    if (!open && selected) {
      setQuery(selected.description)
    }
    if (!value && !open) {
      setQuery('')
    }
  }, [selected, value, open])

  const openMenu = () => setOpen(true)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null)
      return
    }
    const update = () => {
      if (triggerRef.current) setMenuPosition(readMenuPosition(triggerRef.current))
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, query, options.length])

  useEffect(() => {
    if (!open) return
    let removeListener: (() => void) | undefined
    const timer = window.setTimeout(() => {
      const onPointerDown = (e: MouseEvent) => {
        const target = e.target as Node
        if (triggerRef.current?.contains(target)) return
        if (menuRef.current?.contains(target)) return
        setOpen(false)
      }
      document.addEventListener('mousedown', onPointerDown)
      removeListener = () => document.removeEventListener('mousedown', onPointerDown)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      removeListener?.()
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter(
          (o) => o.code.toLowerCase().includes(q) || o.description.toLowerCase().includes(q),
        )
      : options
    return list.slice(0, 24)
  }, [options, query])

  const pick = (option: PlanningLineOption) => {
    onChange(option)
    setQuery(option.description)
    setOpen(false)
  }

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] max-h-56 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg2)] p-1.5 shadow-2xl scrollbar-thin"
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
          >
            {options.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-[var(--color-text2)]">Carregando códigos…</p>
            ) : filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-[var(--color-text2)]">Nenhum código encontrado.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition hover:bg-white/5"
                >
                  <span className="text-xs text-[var(--color-text)]">{o.description}</span>
                  <span className="font-mono text-[10px] text-[var(--color-text2)]">{o.code}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="space-y-3">
      <div>
        <label className="label mb-1">Código orçamentário</label>
        <div ref={triggerRef}>
          <SearchInput
            size="sm"
            value={query}
            onFocus={openMenu}
            onClick={openMenu}
            onChange={(v) => {
              setQuery(v)
              openMenu()
              if (!v.trim()) onClear?.()
            }}
            placeholder="Buscar por descrição ou código…"
          />
        </div>
      </div>
      {selected ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg2)]/40 px-3 py-2">
          <p className="text-xs text-[var(--color-text2)]">{selected.description}</p>
          <p className="mt-1 font-mono text-[11px] text-[var(--color-text)]">{selected.code}</p>
        </div>
      ) : null}
      {menu}
    </div>
  )
}
