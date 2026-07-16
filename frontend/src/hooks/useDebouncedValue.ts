import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 320): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return v
}
