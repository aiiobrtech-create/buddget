import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import type { ExecutiveCharts } from '@/types/dashboard'
import { formatBRL } from '@/lib/formatters/currency'
import { createChartCurrencyAxisFormatter } from '@/lib/formatters/chart-axis'

export function ForecastTriLinesChart({ data }: { data: ExecutiveCharts['forecastTrend'] }) {
  const formatAxisTick = useMemo(
    () => createChartCurrencyAxisFormatter(data.flatMap((row) => [row.original, row.revisao, row.forecast])),
    [data],
  )

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 12 }}>
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
        <Tooltip formatter={(value) => formatBRL(Number(value ?? 0))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="original" name="Orçamento original" stroke="rgba(129,140,248,0.95)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="revisao" name="Revisão" stroke="#22d3ee" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
