function formatScaled(value: number, divisor: number, suffix: string): string {
  const scaled = value / divisor
  const abs = Math.abs(scaled)
  if (abs >= 100) return `${Math.round(scaled)}${suffix}`
  if (abs >= 10) return `${Math.round(scaled)}${suffix}`
  if (abs >= 1) return `${Number(scaled.toFixed(1))}${suffix}`
  if (abs > 0) return `${Number(scaled.toFixed(2))}${suffix}`
  return `0${suffix}`
}

/** Escala o eixo Y conforme a magnitude dos valores (unidade, milhares ou milhões). */
export function createChartCurrencyAxisFormatter(values: number[]) {
  const max = values.length ? Math.max(...values.map((v) => Math.abs(v))) : 0

  if (max >= 1_000_000) {
    return (v: number) => formatScaled(v, 1_000_000, 'M')
  }
  if (max >= 1_000) {
    return (v: number) => formatScaled(v, 1_000, 'k')
  }
  return (v: number) => {
    const rounded = Math.round(v)
    return Number.isFinite(rounded) ? String(rounded) : '0'
  }
}
