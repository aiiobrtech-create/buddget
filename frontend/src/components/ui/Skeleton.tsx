import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5', className)}
    />
  )
}
