import { FilterBar, FilterField, MultiSelect } from '@/components/ui'
import { useGlobalFilters } from '@/context/global-filters-context'

export function GlobalFilterBar({
  embedded = false,
  showYearMonth = true,
  showCompanyGroups = true,
  showCompanies = true,
  showBudgets = true,
  showClasses = true,
  showCostCenters = true,
  showCategories = true,
}: {
  embedded?: boolean
  showYearMonth?: boolean
  showCompanyGroups?: boolean
  showCompanies?: boolean
  showBudgets?: boolean
  showClasses?: boolean
  showCostCenters?: boolean
  showCategories?: boolean
}) {
  const {
    companyGroupIds,
    setCompanyGroupIds,
    companyGroupOptions,
    companyIds,
    setCompanyIds,
    companyOptions,
    budgetIds,
    setBudgetIds,
    budgetOptions,
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
    yearOptions,
    monthIds,
    setMonthIds,
    monthOptions,
  } = useGlobalFilters()

  const handleExclusiveAll = (newVal: string[], oldVal: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (newVal.length === 0) {
      setter(['all'])
    } else if (!oldVal.includes('all') && newVal.includes('all')) {
      setter(['all'])
    } else if (oldVal.includes('all') && newVal.length > 1) {
      setter(newVal.filter((x) => x !== 'all'))
    } else {
      setter(newVal)
    }
  }

  const content = (
    <>
      {showBudgets ? (
        <FilterField label="Orçamento">
          <MultiSelect
            size="sm"
            values={budgetIds}
            onChange={(v) => handleExclusiveAll(v, budgetIds, setBudgetIds)}
            options={budgetOptions}
            placeholder="Orçamento..."
          />
        </FilterField>
      ) : null}

      {showYearMonth ? (
        <>
          <FilterField label="Ano" className="max-w-[6.5rem]">
            <MultiSelect
              size="sm"
              selectionMode="single"
              values={yearIds}
              onChange={setYearIds}
              options={yearOptions}
              placeholder="Ano..."
            />
          </FilterField>
          <FilterField label="Mês" className="max-w-[8.5rem]">
            <MultiSelect
              size="sm"
              values={monthIds}
              onChange={(v) => handleExclusiveAll(v, monthIds, setMonthIds)}
              options={monthOptions}
              placeholder="Mês..."
            />
          </FilterField>
        </>
      ) : null}

      {showCompanyGroups ? (
        <FilterField label="Grupo de empresas">
          <MultiSelect
            size="sm"
            values={companyGroupIds}
            onChange={(v) => handleExclusiveAll(v, companyGroupIds, setCompanyGroupIds)}
            options={companyGroupOptions}
            placeholder="Grupos..."
          />
        </FilterField>
      ) : null}

      {showCompanies ? (
        <FilterField label="Empresas">
          <MultiSelect
            size="sm"
            values={companyIds}
            onChange={(v) => handleExclusiveAll(v, companyIds, setCompanyIds)}
            options={companyOptions}
            placeholder="Empresas..."
          />
        </FilterField>
      ) : null}

      {showClasses ? (
        <FilterField label="Classes">
          <MultiSelect
            size="sm"
            values={classIds}
            onChange={(v) => handleExclusiveAll(v, classIds, setClassIds)}
            options={classOptions}
            placeholder="Classes..."
          />
        </FilterField>
      ) : null}

      {showCategories ? (
        <FilterField label="Categorias">
          <MultiSelect
            size="sm"
            values={categoryIds}
            onChange={(v) => handleExclusiveAll(v, categoryIds, setCategoryIds)}
            options={categoryOptions}
            placeholder="Categorias..."
          />
        </FilterField>
      ) : null}

      {showCostCenters ? (
        <FilterField label="Centros de custo">
          <MultiSelect
            size="sm"
            values={ccIds}
            onChange={(v) => handleExclusiveAll(v, ccIds, setCcIds)}
            options={ccOptions}
            placeholder="Centros..."
          />
        </FilterField>
      ) : null}
    </>
  )

  if (embedded) return content

  return <FilterBar>{content}</FilterBar>
}
