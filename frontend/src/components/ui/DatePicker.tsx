import { cn } from '@/lib/utils'

export function DatePicker({
  value,
  onChange,
  className,
  size = 'md',
}: {
  value: string
  onChange: (isoDate: string) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <input
      type="date"
      className={cn('input [color-scheme:dark]', size === 'sm' && 'px-2 py-1.5 text-xs', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
