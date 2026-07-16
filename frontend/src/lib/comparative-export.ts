import type { ComparisonRow } from '@/types/entities'
import type { NatureSectionId } from '@/lib/formatters/saldo-display'

export type ComparativeNatureSection = NatureSectionId

export type ComparativeFlatRow = ComparisonRow & {
  depth: number
  natureSection?: ComparativeNatureSection
}

export function resolveNatureSectionFromRowId(id: string): ComparativeNatureSection | undefined {
  if (id.startsWith('section-receitas')) return 'receitas'
  if (id.startsWith('section-despesas')) return 'despesas'
  if (id.startsWith('section-capex')) return 'capex'
  return undefined
}

/** Exporta a árvore inteira (independente do estado expandido na tela). */
export function flattenFullComparativeTree(
  rows: ComparisonRow[],
  depth = 0,
  natureSection?: ComparativeNatureSection,
): ComparativeFlatRow[] {
  const out: ComparativeFlatRow[] = []
  for (const row of rows) {
    const currentSection = resolveNatureSectionFromRowId(row.id) ?? natureSection
    out.push({ ...row, depth, natureSection: currentSection })
    const kids = row.children ?? []
    if (kids.length) {
      out.push(...flattenFullComparativeTree(kids, depth + 1, currentSection))
    }
  }
  return out
}

export function formatComparativeStructureLabel(row: ComparisonRow): string {
  if (row.code) return `${row.code} — ${row.label}`
  return row.label
}

export function comparativeRowVariant(row: ComparisonRow): 'root' | 'section' | 'default' {
  if (row.id === 'root') return 'root'
  if (row.level === 1) return 'section'
  return 'default'
}
