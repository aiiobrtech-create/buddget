/** Aceita `{ items: T[] }` ou array direto do backend legado. */
export function unwrapItems<T>(data: { items?: T[] } | T[] | null | undefined): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.items ?? []
}
