const RETRYABLE_STATUS = new Set([502, 503, 504])

export function isRetryableStatus(status: number) {
  return RETRYABLE_STATUS.has(status)
}

export function retryDelayMs(attempt: number) {
  return 800 * (attempt + 1)
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
