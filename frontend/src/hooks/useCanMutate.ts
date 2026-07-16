import { useAuth } from '@/context/auth-context'
import { canMutateData } from '@/modules/auth/permissions'

/** Indica se o usuário logado pode criar, editar ou excluir dados. */
export function useCanMutate(): boolean {
  const { user } = useAuth()
  return user ? canMutateData(user.role) : false
}
