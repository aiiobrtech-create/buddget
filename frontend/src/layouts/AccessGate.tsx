import { useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { canAccessPath } from '@/modules/auth/permissions'
import { ForbiddenPage } from '@/pages/system/ForbiddenPage'

export function AccessGate() {
  const { user } = useAuth()
  const loc = useLocation()

  if (user && !canAccessPath(loc.pathname, user.role, user.allowResumo)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
