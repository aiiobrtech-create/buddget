import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const close = (result: boolean) => {
    setOpen(false)
    resolver?.(result)
    setResolver(null)
    setOpts(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={() => close(false)}
        title={opts?.title ?? 'Confirmar'}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-toolbar-secondary" onClick={() => close(false)}>
              {opts?.cancelText ?? 'Cancelar'}
            </button>
            <button
              type="button"
              className={cn(opts?.variant === 'danger' ? 'btn-toolbar-danger' : 'btn-toolbar-primary')}
              onClick={() => close(true)}
            >
              {opts?.confirmText ?? 'Confirmar'}
            </button>
          </div>
        }
      >
        {opts?.description ? (
          <p className="text-sm leading-relaxed text-[var(--color-text2)]">{opts.description}</p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm fora do ConfirmProvider')
  return ctx
}
