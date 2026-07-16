import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const MIN_PX = 11

export function KpiAutoFitValue({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const fit = () => {
      inner.style.removeProperty('font-size')
      const avail = outer.clientWidth
      if (avail <= 0) return

      const computed = window.getComputedStyle(inner)
      const maxPx = Math.floor(parseFloat(computed.fontSize) || 36)
      inner.style.fontSize = `${maxPx}px`
      if (inner.scrollWidth <= avail) {
        inner.style.removeProperty('font-size')
        return
      }

      let lo = MIN_PX
      let hi = maxPx
      let best = MIN_PX
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2)
        inner.style.fontSize = `${mid}px`
        if (inner.scrollWidth <= avail) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      inner.style.fontSize = `${best}px`
    }

    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(outer)
    window.addEventListener('beforeprint', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('beforeprint', fit)
    }
  }, [children])

  return (
    <div ref={outerRef} className="min-w-0 w-full overflow-hidden">
      <span
        ref={innerRef}
        className={cn(
          'kpi inline-block whitespace-nowrap tabular-nums text-3xl leading-[1.12] tracking-tight md:text-4xl',
          className,
        )}
      >
        {children}
      </span>
    </div>
  )
}
