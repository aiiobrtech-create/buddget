function maxNumericCode(existing: { code: string }[]): number {
  return existing.reduce((acc, row) => {
    const digits = row.code.replace(/\D/g, '')
    const n = digits ? parseInt(digits, 10) : 0
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
}

function nextCode(existing: { code: string }[], width: number): string {
  return String(maxNumericCode(existing) + 1).padStart(width, '0')
}

function nextUnpaddedCode(existing: { code: string }[], ceiling: number): string {
  const next = maxNumericCode(existing) + 1
  return next > ceiling ? String(ceiling) : String(next)
}

export function nextSequentialCode(existing: { code: string }[]): string {
  return nextCode(existing, 6)
}

/** Até 2 dígitos, sem zeros à esquerda (ex.: 1, 2, 99). */
export function nextTwoDigitCode(existing: { code: string }[]): string {
  return nextUnpaddedCode(existing, 99)
}

export function sanitizeDigitCodeInput(code: string, maxLength = 6): string {
  return code.replace(/\D/g, '').slice(0, maxLength)
}

export function normalizeSixDigitCode(code: string): string {
  const digits = sanitizeDigitCodeInput(code)
  if (!digits) return ''
  return digits.padStart(6, '0')
}

export function normalizeTwoDigitCode(code: string): string {
  const digits = sanitizeDigitCodeInput(code, 2)
  if (!digits) return ''
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(n)
}

export function sanitizeClassCodeInput(code: string): string {
  return code.replace(/\./g, '').replace(/\D/g, '').slice(0, 4)
}

/** Até 4 dígitos, sem zeros à esquerda (ex.: 1, 2, 1000). */
export function normalizeClassCode(code: string): string {
  const digits = sanitizeClassCodeInput(code)
  if (!digits) return ''
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(n)
}

export function nextClassCode(existing: { code: string }[]): string {
  return nextUnpaddedCode(existing, 9999)
}

export function sanitizeCategoryCodeInput(code: string): string {
  return code.replace(/\./g, '').replace(/\D/g, '').slice(0, 6)
}

/** Até 6 dígitos, sem zeros à esquerda (ex.: 1, 2, 999999). */
export function normalizeCategoryCode(code: string): string {
  const digits = sanitizeCategoryCodeInput(code)
  if (!digits) return ''
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(n)
}

export function nextCategoryCode(existing: { code: string }[]): string {
  return nextUnpaddedCode(existing, 999999)
}

export function nextCategoryCodeForClass(
  existing: Array<{ code: string; classId: string }>,
  classId: string,
): string {
  const scoped = existing.filter((row) => row.classId === classId)
  return nextUnpaddedCode(scoped, 999999)
}

export function isCategoryCodeTaken(
  existing: Array<{ id?: string; code: string; classId: string }>,
  classId: string,
  code: string,
  excludeId?: string,
): boolean {
  return existing.some(
    (row) => row.classId === classId && row.code === code && row.id !== excludeId,
  )
}

export function sanitizeCostCenterCodeInput(code: string): string {
  return sanitizeCategoryCodeInput(code)
}

/** Até 6 dígitos, sem zeros à esquerda (ex.: 1, 2, 999999). */
export function normalizeCostCenterCode(code: string): string {
  return normalizeCategoryCode(code)
}

export function nextCostCenterCode(existing: { code: string }[]): string {
  return nextUnpaddedCode(existing, 999999)
}

export function nextBudgetItemCode(existing: { code: string }[]): string {
  return nextUnpaddedCode(existing, 999999)
}

export function sanitizeBudgetItemCodeInput(code: string): string {
  return sanitizeCategoryCodeInput(code)
}

export function normalizeBudgetItemCode(code: string): string {
  return normalizeCategoryCode(code)
}
