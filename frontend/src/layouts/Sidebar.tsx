import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { env } from '@/lib/env'
import { filterNavForRole } from '@/lib/navigation'
import { NavSection } from './NavSection'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { user } = useAuth()
  const sections = user ? filterNavForRole(user.role, user.allowResumo) : []

  return (
    <aside className="app-shell-chrome fixed left-0 top-0 z-40 hidden h-full w-[280px] border-r border-[var(--color-border)] bg-[var(--color-bg2)]/35 backdrop-blur-xl md:block">
      <div className="flex h-full flex-col">
        <div className="flex justify-center px-5 py-5">
          <img src="/logo-buddget-b.svg" alt={env.appName} className="block h-auto w-full max-w-[240px] select-none" draggable="false" />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin">
          {sections.map((s) => (
            <NavSection key={s.title} title={s.title}>
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition',
                      isActive
                        ? 'bg-[var(--color-bg4)] text-[var(--color-text)] shadow-sm ring-1 ring-[var(--color-border-strong)]'
                        : 'text-[var(--color-text2)] hover:bg-white/5 hover:text-[var(--color-text)]',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <it.icon
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] group-hover:text-[var(--color-text2)]',
                        )}
                      />
                      <span className="min-w-0 truncate">{it.label}</span>
                      {isActive ? (
                        <motion.span layoutId="nav-pill" className="ml-auto h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      ) : (
                        <span className="ml-auto opacity-0"> </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </NavSection>
          ))}
        </nav>
      </div>
    </aside>
  )
}
