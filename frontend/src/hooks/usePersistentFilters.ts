import { useEffect, useState } from 'react'

export function usePersistentFilters<T extends Record<string, string>>(
  storageKey: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const key = `buddget:filters:${storageKey}`

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed = JSON.parse(raw) as Partial<T>
      return { ...initial, ...parsed }
    } catch {
      return initial
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}
