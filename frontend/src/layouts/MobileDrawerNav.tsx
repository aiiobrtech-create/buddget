import { NavLink } from 'react-router-dom'
import { Drawer } from '@/components/ui/Drawer'
import { filterNavForRole } from '@/lib/navigation'
import { NavSection } from './NavSection'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

export function MobileDrawerNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const sections = user ? filterNavForRole(user.role, user.allowResumo) : []

  return (
    <Drawer open={open} title="Navegação" onClose={onClose} width={360}>
      <div className="space-y-2">
        {sections.map((s) => (
          <NavSection key={s.title} title={s.title}>
            {s.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition',
                    isActive ? 'bg-[var(--color-bg4)] text-[var(--color-text)]' : 'text-[var(--color-text2)] hover:bg-white/5',
                  )
                }
              >
                <it.icon className="h-4 w-4 text-[var(--color-muted)]" />
                <span className="min-w-0 truncate">{it.label}</span>
              </NavLink>
            ))}
          </NavSection>
        ))}
      </div>
    </Drawer>
  )
}
