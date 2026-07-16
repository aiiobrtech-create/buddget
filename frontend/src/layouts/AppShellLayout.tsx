import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileDrawerNav } from './MobileDrawerNav'
import { GlobalFiltersProvider } from '@/context/global-filters-context'

export function AppShellLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <GlobalFiltersProvider>
      <div className="mesh-bg flex h-dvh overflow-hidden">
        <Sidebar />
        {/* Sidebar é fixed: reserva 280px em fluxo para o conteúdo não ficar por baixo */}
        <div className="app-shell-chrome hidden shrink-0 md:block md:w-[280px]" aria-hidden />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="app-main mx-auto flex min-h-0 w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-y-auto px-4 py-4 md:px-8 md:py-6">
            <Outlet />
          </main>
        </div>
        <MobileDrawerNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </GlobalFiltersProvider>
  )
}
