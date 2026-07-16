import { formatCurrencyMaskInput, parseCurrencyMaskInput } from '@/lib/formatters/currency'
import { cn } from '@/lib/utils'

export function CurrencyInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
}) {
  return (
    <input
      inputMode="numeric"
      className={cn('input font-mono text-sm', className)}
      value={formatCurrencyMaskInput(value)}
      placeholder="R$ 0,00"
      onChange={(e) => onChange(parseCurrencyMaskInput(e.target.value))}
    />
  )
}
