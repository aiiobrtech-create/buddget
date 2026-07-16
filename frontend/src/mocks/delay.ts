export function mockDelay(ms = 320) {
  return new Promise<void>((r) => setTimeout(r, ms))
}
