import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Drawer({ open, title, onClose, children, footer, width = 440 }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[85]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar painel" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 z-10 h-full glass border-l border-[var(--color-border)] shadow-2xl"
            style={{ width: `min(${width}px, 100vw)` }}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
                <button type="button" className="btn-ghost rounded-md p-1.5" onClick={onClose} aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
              {footer ? <div className="border-t border-[var(--color-border)] px-5 py-4">{footer}</div> : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
