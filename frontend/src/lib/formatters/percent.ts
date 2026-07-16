/** Percentual do orçado já realizado — mesma regra do Resumo. */
export function executionPct(planned: number, actual: number): number {
  return planned > 0 ? (actual / planned) * 100 : 0
}

export function formatPct(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
