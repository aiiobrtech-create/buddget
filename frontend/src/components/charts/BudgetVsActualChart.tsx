import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import type { ExecutiveCharts } from '@/types/dashboard'
import { formatBRL } from '@/lib/formatters/currency'
import { createChartCurrencyAxisFormatter } from '@/lib/formatters/chart-axis'

export function BudgetVsActualChart({
  data,
}: {
  data: ExecutiveCharts['budgetVsActualByMonth']
}) {
  const formatAxisTick = useMemo(
    () => createChartCurrencyAxisFormatter(data.flatMap((row) => [row.orcado, row.realizado])),
    [data],
  )

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <ComposedChart
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 12 }}
        barCategoryGap="32%"
      >
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 10 }}
          interval={0}
          minTickGap={0}
          angle={-20}
          textAnchor="end"
          height={48}
          tickFormatter={(value) => String(value ?? '')}
        />
        <YAxis
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 11 }}
          tickFormatter={formatAxisTick}
        />
        <Tooltip
          formatter={(value, name) => [
            formatBRL(Number(value ?? 0)),
            name,
          ]}
          labelFormatter={(l) => String(l ?? '')}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="orcado"
          name="Orçado"
          fill="rgba(99,102,241,0.45)"
          maxBarSize={48}
          radius={[3, 3, 0, 0]}
        />
        <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#22d3ee" strokeWidth={1.75} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
