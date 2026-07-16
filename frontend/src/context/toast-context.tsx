import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title: string
  message?: string
  variant: ToastVariant
}

interface ToastContextValue {
  push: (t: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const uid = useId()

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${uid}-${Math.random().toString(16).slice(2)}`
    const next: ToastItem = { ...t, id }
    setItems((prev) => [...prev, next])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, 5200)
  }, [uid])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const value = useMemo(() => ({ push }), [push])

  const Icon = (v: ToastVariant) => {
    if (v === 'success') return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
    if (v === 'error') return <AlertCircle className="h-5 w-5 text-rose-400" aria-hidden />
    return <Info className="h-5 w-5 text-cyan-300" aria-hidden />
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(420px,calc(100vw-3rem))] flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="pointer-events-auto glass glass-hover rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 shadow-2xl"
            >
              <div className="flex gap-3">
                <div className="mt-0.5">{Icon(t.variant)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{t.title}</div>
                  {t.message ? (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text2)]">{t.message}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="btn-ghost rounded-md p-1 text-[var(--color-muted)] hover:text-[var(--color-text)]"
                  aria-label="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
