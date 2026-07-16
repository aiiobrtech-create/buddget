import { env } from '@/lib/env'
import { apiGetData } from '@/services/api/client'
import { mockDelay } from '@/mocks/delay'
import { mockComparisonTree } from '@/mocks/fixtures'
import { userSession } from '@/lib/session'
import type { ComparisonRow } from '@/types/entities'
import { executionPct } from '@/lib/formatters/percent'

function withExecutionMetrics(nodes: ComparisonRow[]): ComparisonRow[] {
  return nodes.map((node) => ({
    ...node,
    variancePct: executionPct(node.budgeted, node.actual),
    children: node.children ? withExecutionMetrics(node.children) : undefined,
  }))
}

function filterRowsByAccess(nodes: ComparisonRow[]): ComparisonRow[] {
  const user = userSession.get()
  const access = user?.role === 'admin' ? undefined : user?.access
  if (!access) return nodes

  const categorySet = access.categoryIds?.length ? new Set(access.categoryIds) : undefined
  const costCenterSet = access.costCenterIds?.length ? new Set(access.costCenterIds) : undefined

  const filterNode = (node: ComparisonRow): ComparisonRow | null => {
    const children = node.children?.map(filterNode).filter((child): child is ComparisonRow => Boolean(child))

    const canSeeSelf = (() => {
      if (node.level === 1 && costCenterSet) return costCenterSet.has(node.id)
      if (node.level === 2 && categorySet) return categorySet.has(node.id)
      return true
    })()

    if (!canSeeSelf && (!children || children.length === 0)) return null

    return {
      ...node,
      children: children && children.length ? children : undefined,
    }
  }

  return nodes.map(filterNode).filter((node): node is ComparisonRow => Boolean(node))
}

function normalizeFilterList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined
  const filtered = values.filter((v) => v && v !== 'all')
  return filtered.length ? filtered : undefined
}

function serializeComparativeQuery(query: {
  year?: number
  yearIds?: string[]
  monthIds?: string[]
  companyIds?: string[]
  budgetIds?: string[]
  versionId?: string
  classIds?: string[]
  costCenterIds?: string[]
  categoryIds?: string[]
}): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {}
  if (query.year !== undefined) out.year = query.year
  if (query.versionId) out.versionId = query.versionId
  const yearIds = normalizeFilterList(query.yearIds)
  const monthIds = normalizeFilterList(query.monthIds)
  const companyIds = normalizeFilterList(query.companyIds)
  const budgetIds = normalizeFilterList(query.budgetIds)
  const classIds = normalizeFilterList(query.classIds)
  const costCenterIds = normalizeFilterList(query.costCenterIds)
  const categoryIds = normalizeFilterList(query.categoryIds)
  if (yearIds) out.yearIds = yearIds.join(',')
  if (monthIds) out.monthIds = monthIds.join(',')
  if (companyIds) out.companyIds = companyIds.join(',')
  if (budgetIds) out.budgetIds = budgetIds.join(',')
  if (classIds) out.classIds = classIds.join(',')
  if (costCenterIds) out.costCenterIds = costCenterIds.join(',')
  if (categoryIds) out.categoryIds = categoryIds.join(',')
  return out
}

export const comparativeService = {
  async getTree(
    query: {
      year?: number
      yearIds?: string[]
      monthIds?: string[]
      monthFrom?: number
      monthTo?: number
      companyIds?: string[]
      budgetIds?: string[]
      versionId?: string
      classIds?: string[]
      costCenterIds?: string[]
      categoryIds?: string[]
      projectId?: string
    },
    signal?: AbortSignal,
  ): Promise<{ rows: ComparisonRow[] }> {
    if (env.useMockApi) {
      await mockDelay()
      let rows = filterRowsByAccess(structuredClone(mockComparisonTree))

      // Apply dynamic mock factors to prove that other filters work
      let factor = 1
      if (query.companyIds?.length && !query.companyIds.includes('c1') && !query.companyIds.includes('all')) factor *= 0.45
      if (query.yearIds?.length && !query.yearIds.includes('2026') && !query.yearIds.includes('all')) factor *= 1.15
      if (query.monthIds?.length && !query.monthIds.includes('4') && !query.monthIds.includes('all')) factor *= (parseInt(query.monthIds[0]) / 4)

      if (factor !== 1) {
        const applyFactor = (nodes: ComparisonRow[]): ComparisonRow[] => {
          return nodes.map(n => ({
            ...n,
            budgeted: n.budgeted * factor,
            actual: n.actual * factor,
            variance: n.variance * factor,
            balance: n.balance * factor,
            children: n.children ? applyFactor(n.children) : undefined
          }))
        }
        rows = applyFactor(rows)
      }

      if (query.costCenterIds?.length || query.categoryIds?.length) {
        const filterNodes = (nodes: ComparisonRow[]): ComparisonRow[] => {
          return nodes.reduce<ComparisonRow[]>((acc, node) => {
            let matches = true
            if (query.costCenterIds?.length && !query.costCenterIds.includes('all') && node.level === 1 && !query.costCenterIds.includes(node.id)) matches = false
            if (query.categoryIds?.length && !query.categoryIds.includes('all') && node.level === 2 && !query.categoryIds.includes(node.id)) matches = false

            if (!matches) return acc

            const newNode = { ...node }
            if (newNode.children) {
              newNode.children = filterNodes(newNode.children)
              if (query.categoryIds?.length && !query.categoryIds.includes('all') && newNode.level === 1 && newNode.children.length === 0) {
                return acc
              }
            }
            acc.push(newNode)
            return acc
          }, [])
        }
        rows = filterNodes(rows)
      }

      return { rows: withExecutionMetrics(rows) }
    }
    const result = await apiGetData<{ rows: ComparisonRow[] }>('/reports/comparative', serializeComparativeQuery(query), signal)
    return { rows: filterRowsByAccess(withExecutionMetrics(result.rows)) }
  },
}
