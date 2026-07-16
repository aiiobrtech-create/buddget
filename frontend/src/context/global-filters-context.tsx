import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { SelectOption } from '@/components/ui/Select'
import { buildBudgetFilterOptions, pickBudgetVersionId } from '@/lib/budget-version'
import { MASTERS_CHANGED_EVENT } from '@/lib/masters-events'
import { budgetsService } from '@/services/modules/budgets.service'
import { mastersService } from '@/services/modules/masters.service'
import type { Budget, Category, Company, LedgerClass } from '@/types/entities'

function resolveEffectiveCompanyIds(
  companyGroupIds: string[],
  companyIds: string[],
  companies: Company[],
): string[] | undefined {
  const pickedCompanies = companyIds.filter((id) => id !== 'all')
  if (pickedCompanies.length) return pickedCompanies

  const pickedGroups = companyGroupIds.filter((id) => id !== 'all')
  if (!pickedGroups.length) return undefined

  const groupSet = new Set(pickedGroups)
  const ids = companies.filter((c) => groupSet.has(c.companyGroupId)).map((c) => c.id)
  return ids.length ? ids : undefined
}

interface GlobalFiltersState {
  companyGroupIds: string[]
  setCompanyGroupIds: React.Dispatch<React.SetStateAction<string[]>>
  companyGroupOptions: SelectOption[]

  companyIds: string[]
  setCompanyIds: React.Dispatch<React.SetStateAction<string[]>>
  companyOptions: SelectOption[]
  effectiveCompanyIds: string[] | undefined

  budgetIds: string[]
  setBudgetIds: React.Dispatch<React.SetStateAction<string[]>>
  budgetOptions: SelectOption[]
  selectedVersionId?: string

  classIds: string[]
  setClassIds: React.Dispatch<React.SetStateAction<string[]>>
  classOptions: SelectOption[]

  ccIds: string[]
  setCcIds: React.Dispatch<React.SetStateAction<string[]>>
  ccOptions: SelectOption[]

  categoryIds: string[]
  setCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
  categoryOptions: SelectOption[]

  yearIds: string[]
  setYearIds: React.Dispatch<React.SetStateAction<string[]>>
  yearOptions: SelectOption[]

  monthIds: string[]
  setMonthIds: React.Dispatch<React.SetStateAction<string[]>>
  monthOptions: SelectOption[]

  isLoadingOptions: boolean
}

const GlobalFiltersContext = createContext<GlobalFiltersState | null>(null)

export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext)
  if (!ctx) throw new Error('useGlobalFilters must be used within GlobalFiltersProvider')
  return ctx
}

const STATIC_MONTHS: SelectOption[] = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

const STATIC_YEARS: SelectOption[] = [
  { value: 'all', label: 'Todos' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
]

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [companyGroupIds, setCompanyGroupIds] = useState<string[]>(['all'])
  const [companyIds, setCompanyIds] = useState<string[]>(['all'])
  const [budgetIds, setBudgetIds] = useState<string[]>(['all'])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [classIds, setClassIds] = useState<string[]>(['all'])
  const [ccIds, setCcIds] = useState<string[]>(['all'])
  const [categoryIds, setCategoryIds] = useState<string[]>(['all'])
  const [yearIds, setYearIds] = useState<string[]>(['2026'])
  const [monthIds, setMonthIds] = useState<string[]>(['all'])

  const [companies, setCompanies] = useState<Company[]>([])
  const [companyGroupOptions, setCompanyGroupOptions] = useState<SelectOption[]>([
    { value: 'all', label: 'Todos' },
  ])
  const [classes, setClasses] = useState<LedgerClass[]>([])
  const [ccOptions, setCcOptions] = useState<SelectOption[]>([{ value: 'all', label: 'Todos' }])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  const classOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      ...classes.map((c) => ({
        value: c.id,
        label: c.code ? `${c.code} — ${c.name}` : c.name,
      })),
    ]
  }, [classes])

  const categoryOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      ...categories.map((c) => ({
        value: c.id,
        label: c.code ? `${c.code} — ${c.name}` : c.name,
      })),
    ]
  }, [categories])

  const yearFilter = useMemo(() => {
    const y = Number(yearIds.find((id) => id !== 'all') ?? '')
    return Number.isFinite(y) ? y : undefined
  }, [yearIds])

  const effectiveCompanyIds = useMemo(
    () => resolveEffectiveCompanyIds(companyGroupIds, companyIds, companies),
    [companyGroupIds, companyIds, companies],
  )

  const companyOptions: SelectOption[] = useMemo(() => {
    const pickedGroups = companyGroupIds.filter((id) => id !== 'all')
    const filtered =
      pickedGroups.length > 0
        ? companies.filter((c) => pickedGroups.includes(c.companyGroupId))
        : companies

    return [
      { value: 'all', label: 'Todos' },
      ...filtered.map((c) => ({ value: c.id, label: c.code ? `${c.code} — ${c.name}` : c.name })),
    ]
  }, [companies, companyGroupIds])

  const budgetOptions: SelectOption[] = useMemo(() => {
    const companyFilter = effectiveCompanyIds ? new Set(effectiveCompanyIds) : undefined
    const filtered = budgets.filter((b) => {
      if (yearFilter && b.year !== yearFilter) return false
      if (!companyFilter) return true
      if (b.companyId) return companyFilter.has(b.companyId)
      return companies.some((c) => companyFilter.has(c.id) && c.companyGroupId === b.companyGroupId)
    })
    return [{ value: 'all', label: 'Todos' }, ...buildBudgetFilterOptions(filtered)]
  }, [budgets, effectiveCompanyIds, yearFilter, companies])

  const selectedVersionId = useMemo(() => {
    const budgetId = budgetIds.find((id) => id !== 'all')
    if (!budgetId) return undefined
    const budget = budgets.find((b) => b.id === budgetId)
    return budget ? pickBudgetVersionId(budget) : undefined
  }, [budgetIds, budgets])

  useEffect(() => {
    if (budgetIds.includes('all')) return
    const validIds = budgetIds.filter((id) => budgetOptions.some((o) => o.value === id))
    if (validIds.length !== budgetIds.length) {
      setBudgetIds(validIds.length ? validIds : ['all'])
    }
  }, [budgetIds, budgetOptions])

  useEffect(() => {
    if (companyIds.includes('all')) return
    const pickedGroups = companyGroupIds.filter((id) => id !== 'all')
    if (!pickedGroups.length) return

    const groupSet = new Set(pickedGroups)
    const valid = companyIds.filter((id) => {
      const company = companies.find((c) => c.id === id)
      return company && groupSet.has(company.companyGroupId)
    })
    if (valid.length !== companyIds.length) {
      setCompanyIds(valid.length ? valid : ['all'])
    }
  }, [companyGroupIds, companyIds, companies])

  const loadMasterOptions = useCallback(async () => {
    setIsLoadingOptions(true)
    try {
      const [companyGroups, companies, classes, ccs, categories, budgetList] = await Promise.all([
        mastersService.listCompanyGroups(),
        mastersService.listCompanies(),
        mastersService.listClasses(),
        mastersService.listCostCenters(),
        mastersService.listCategories(),
        budgetsService.listBudgets(),
      ])

      setCompanyGroupOptions([
        { value: 'all', label: 'Todos' },
        ...companyGroups.map((g) => ({ value: g.id, label: g.code ? `${g.code} — ${g.name}` : g.name })),
      ])

      setCompanies(companies)
      setBudgets(budgetList.items)

      setClasses(classes)

      setCcOptions([
        { value: 'all', label: 'Todos' },
        ...ccs.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
      ])

      setCategories(categories)
    } catch {
      // Mantém opções anteriores em caso de falha transitória.
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    void loadMasterOptions()
  }, [loadMasterOptions, location.pathname])

  useEffect(() => {
    const refresh = () => void loadMasterOptions()
    window.addEventListener('focus', refresh)
    window.addEventListener(MASTERS_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener(MASTERS_CHANGED_EVENT, refresh)
    }
  }, [loadMasterOptions])

  return (
    <GlobalFiltersContext.Provider
      value={{
        companyGroupIds,
        setCompanyGroupIds,
        companyGroupOptions,
        companyIds,
        setCompanyIds,
        companyOptions,
        effectiveCompanyIds,
        budgetIds,
        setBudgetIds,
        budgetOptions,
        selectedVersionId,
        classIds,
        setClassIds,
        classOptions,
        ccIds,
        setCcIds,
        ccOptions,
        categoryIds,
        setCategoryIds,
        categoryOptions,
        yearIds,
        setYearIds,
        yearOptions: STATIC_YEARS,
        monthIds,
        setMonthIds,
        monthOptions: STATIC_MONTHS,
        isLoadingOptions,
      }}
    >
      {children}
    </GlobalFiltersContext.Provider>
  )
}
