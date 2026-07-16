export function percentageDeviation(planned: number, actual: number): number {
  if (planned === 0) {
    return actual === 0 ? 0 : 100;
  }

  return ((actual - planned) / planned) * 100;
}

/** Percentual do orçado já realizado (0–100+). */
export function percentageExecution(planned: number, actual: number): number {
  if (planned === 0) return 0;
  return (actual / planned) * 100;
}
