import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ExecutiveCharts } from '@/types/dashboard'

type ExecutionRow = {
  label: string
  executionPct: number
  health: 'ok' | 'attention' | 'over'
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

export function MonthlyExecutionChart({
  data,
}: {
  data: ExecutiveCharts['budgetVsActualByMonth']
}) {
  const rows = useMemo<ExecutionRow[]>(
    () =>
      data.map((row) => {
        const executionPct = row.orcado > 0 ? (row.realizado / row.orcado) * 100 : 0
        const health = executionPct > 115 ? 'over' : executionPct > 100 ? 'attention' : 'ok'
        return { label: row.label, executionPct, health }
      }),
    [data],
  )

  const maxPct = rows.length ? Math.max(100, ...rows.map((row) => row.executionPct)) : 100

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 12 }} barCategoryGap="32%">
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
        />
        <YAxis
          domain={[0, Math.ceil(maxPct / 10) * 10]}
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 11 }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          formatter={(value) => [formatPct(Number(value ?? 0)), 'Execução']}
          labelFormatter={(label) => String(label ?? '')}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
          }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
        />
        <ReferenceLine
          y={100}
          stroke="rgba(148,163,184,0.45)"
          strokeDasharray="4 4"
          label={{
            value: '100%',
            position: 'insideTopRight',
            fill: 'rgba(148,163,184,0.85)',
            fontSize: 10,
          }}
        />
        <Bar dataKey="executionPct" name="Execução" maxBarSize={48} radius={[3, 3, 0, 0]}>
          {rows.map((row, index) => (
            <Cell
              key={index}
              fill={row.health === 'over' ? '#fb7185' : row.health === 'attention' ? '#fbbf24' : '#34d399'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
