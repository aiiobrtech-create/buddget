import { Select } from './Select'

const months = Array.from({ length: 12 }).map((_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: new Date(2020, i, 1).toLocaleString('pt-BR', { month: 'long' }),
}))

export function MonthPicker({
  month,
  year,
  onChange,
}: {
  month: number
  year: number
  onChange: (m: { month: number; year: number }) => void
}) {
  const years = Array.from({ length: 7 }).map((_, i) => {
    const y = new Date().getFullYear() - 3 + i
    return { value: String(y), label: String(y) }
  })

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
      <div className="min-w-0 sm:flex-1">
        <Select
          value={String(month).padStart(2, '0')}
          onChange={(v) => onChange({ month: Number(v), year })}
          options={months}
          placeholder="Mês"
          className="w-full"
        />
      </div>
      <div className="min-w-0 sm:w-[7.5rem] sm:shrink-0">
        <Select
          value={String(year)}
          onChange={(v) => onChange({ month, year: Number(v) })}
          options={years}
          placeholder="Ano"
          className="w-full"
        />
      </div>
    </div>
  )
}
