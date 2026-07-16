export interface ResumoLine {
  id: string
  code: string
  label: string
  planned: number
  actual: number
  variationPct: number
  balance: number
  isTotal?: boolean
}

export interface ResumoSection {
  id: string
  title: string
  rows: ResumoLine[]
}

export interface ResumoHighlight {
  title: string
  planned: number
  actual: number
  variationPct: number
  balance?: number
}

export interface BudgetResumo {
  year: number
  sections: ResumoSection[]
  operationalSurplus: ResumoHighlight
  netSurplus: ResumoHighlight
}
