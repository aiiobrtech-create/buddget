import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import type { ExecutiveCharts } from '@/types/dashboard'
import { formatBRL } from '@/lib/formatters/currency'
import { createChartCurrencyAxisFormatter } from '@/lib/formatters/chart-axis'

function varianceAxisLabel(name: unknown) {
  const text = String(name ?? '').trim()
  return text || '—'
}

export function TopVarianceChart({ data }: { data: ExecutiveCharts['topVariances'] }) {
  const signed = data.map((d) => ({ ...d, v: d.variance }))
  const minV = signed.length ? Math.min(0, ...signed.map((d) => d.v)) : 0
  const maxV = signed.length ? Math.max(0, ...signed.map((d) => d.v)) : 1
  const formatAxisTick = useMemo(
    () => createChartCurrencyAxisFormatter(signed.map((d) => d.v)),
    [signed],
  )
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart
        data={signed}
        layout="vertical"
        margin={{ left: 4, right: 10, top: 8, bottom: 8 }}
        barCategoryGap="28%"
      >
        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          domain={[minV, maxV]}
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 10 }}
          tickFormatter={formatAxisTick}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={52}
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 11 }}
          tickMargin={6}
          tickFormatter={varianceAxisLabel}
        />
        <Tooltip 
          formatter={(value) => [formatBRL(Number(value ?? 0)), 'Variação']}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
        />
        <Bar dataKey="v" maxBarSize={36} radius={[0, 3, 3, 0]}>
          {signed.map((e, i) => (
            <Cell key={i} fill={e.health === 'over' ? '#fb7185' : e.health === 'attention' ? '#fbbf24' : '#34d399'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
