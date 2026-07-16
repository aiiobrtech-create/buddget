import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchInput({
  value,
  onChange,
  onFocus,
  onClick,
  placeholder = 'Buscar…',
  className,
  size = 'md',
}: {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  onClick?: () => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const compact = size === 'sm'

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-muted)]',
          compact ? 'left-2 h-3 w-3' : 'left-3 h-4 w-4',
        )}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onClick={onClick}
        placeholder={placeholder}
        className={cn('input w-full min-w-0', compact ? 'px-2 py-1.5 pl-7 text-xs' : 'pl-10')}
      />
    </div>
  )
}
