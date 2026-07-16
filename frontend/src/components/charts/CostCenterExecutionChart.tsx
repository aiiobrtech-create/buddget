import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ExecutiveCharts } from '@/types/dashboard'

type CostCenterRow = {
  code: string
  name: string
  pct: number
}

function costCenterTooltipLabel(payload: readonly { payload?: CostCenterRow }[]) {
  const row = payload[0]?.payload
  if (!row) return ''
  if (row.name && row.code && row.name !== row.code) {
    return `${row.name} · ${row.code}`
  }
  return row.name || row.code || ''
}

function truncateAxisLabel(value: string, max = 14) {
  const text = value.trim()
  if (!text) return '—'
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function CostCenterExecutionChart({
  data,
}: {
  data: ExecutiveCharts['executionByCostCenter']
}) {
  const rows: CostCenterRow[] = data.map((d) => ({
    code: d.code,
    name: d.name?.trim() || d.code,
    pct: Math.round(d.executionPct * 100),
  }))
  const maxPct = rows.length ? Math.max(100, ...rows.map((r) => r.pct)) : 100

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={50}>
      <BarChart data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 4 }} barCategoryGap="36%">
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 10 }}
          angle={-30}
          textAnchor="end"
          height={52}
          interval={0}
          tickFormatter={(value) => truncateAxisLabel(String(value))}
        />
        <YAxis
          domain={[0, maxPct]}
          stroke="rgba(148,163,184,0.55)"
          tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(v) => [`${Number(v ?? 0)}%`, 'Execução']}
          labelFormatter={(_, payload) => costCenterTooltipLabel(payload)}
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
          itemStyle={{ color: '#e2e8f0' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 500 }}
        />
        <Bar dataKey="pct" fill="rgba(34,211,238,0.45)" maxBarSize={48} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
