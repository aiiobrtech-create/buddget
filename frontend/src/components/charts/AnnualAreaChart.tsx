import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import type { ExecutiveCharts } from '@/types/dashboard'
import { formatBRL } from '@/lib/formatters/currency'
import { createChartCurrencyAxisFormatter } from '@/lib/formatters/chart-axis'

export function AnnualAreaChart({ data }: { data: ExecutiveCharts['annualConsolidated'] }) {
  const formatAxisTick = useMemo(
    () => createChartCurrencyAxisFormatter(data.flatMap((row) => [row.orcadoAcum, row.realizadoAcum])),
    [data],
  )

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 12 }}>
        <defs>
          <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.55)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
          </linearGradient>
          <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.02)" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 10 }}
          interval="preserveStartEnd"
          angle={-15}
          textAnchor="end"
          height={44}
        />
        <YAxis stroke="rgba(148,163,184,0.55)" tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 11 }} tickFormatter={formatAxisTick} />
        <Tooltip
          formatter={(value, name) => [
            formatBRL(Number(value ?? 0)),
            String(name) === 'orcadoAcum' ? 'Orçado acum.' : 'Realizado acum.',
          ]}
        />
        <Area type="monotone" dataKey="orcadoAcum" stroke="#818cf8" fill="url(#gO)" strokeWidth={2} />
        <Area type="monotone" dataKey="realizadoAcum" stroke="#22d3ee" fill="url(#gR)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
