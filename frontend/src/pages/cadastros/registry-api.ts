import { getErrorMessage } from '@/services/api/errors'
import type { useToast } from '@/context/toast-context'

type ToastApi = ReturnType<typeof useToast>

export function loadRegistryRows<T>(
  toast: ToastApi,
  load: () => Promise<T[]>,
  setRows: (rows: T[]) => void,
) {
  void load()
    .then(setRows)
    .catch((err) => {
      toast.push({
        variant: 'error',
        title: 'Erro ao carregar dados',
        message: getErrorMessage(err),
      })
    })
}

export async function runRegistrySave(
  toast: ToastApi,
  action: () => Promise<void>,
  successTitle: string,
  onSuccess?: () => void,
) {
  try {
    await action()
    toast.push({ variant: 'success', title: successTitle })
    onSuccess?.()
  } catch (err) {
    const message = getErrorMessage(err)
    toast.push({
      variant: 'error',
      title: message.includes('\n') ? 'Não foi possível salvar' : `Não foi possível salvar — ${message}`,
      message: message.includes('\n') ? message : undefined,
    })
  }
}

export async function runRegistryDelete(
  toast: ToastApi,
  action: () => Promise<void>,
  successTitle: string,
  onSuccess?: () => void,
) {
  try {
    await action()
    toast.push({ variant: 'success', title: successTitle })
    onSuccess?.()
  } catch (err) {
    const message = getErrorMessage(err)
    toast.push({
      variant: 'error',
      title: message.includes('\n') ? 'Não foi possível excluir' : `Não foi possível excluir — ${message}`,
      message: message.includes('\n') ? message : undefined,
    })
  }
}
