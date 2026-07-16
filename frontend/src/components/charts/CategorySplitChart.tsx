import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ExecutiveCharts } from '@/types/dashboard'
import { formatBRL } from '@/lib/formatters/currency'

const COLORS = ['#6366f1', '#22d3ee', '#a78bfa', '#34d399', '#fb7185', '#fbbf24']

export function CategorySplitChart({ data }: { data: ExecutiveCharts['categorySplit'] }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="72%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.25)" />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => {
            const amount = Number(v ?? 0)
            const pct = total > 0 ? (amount / total) * 100 : 0
            return [`${pct.toFixed(1)}% · ${formatBRL(amount)}`, String(name ?? '')]
          }}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
