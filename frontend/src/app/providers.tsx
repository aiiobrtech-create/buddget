import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/auth-context'
import { ToastProvider } from '@/context/toast-context'
import { ConfirmProvider } from '@/context/confirm-context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
