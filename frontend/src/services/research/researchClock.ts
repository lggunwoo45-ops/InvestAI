const clocks = new WeakMap<object, { serverAt: number; receivedAt: number }>()

/** Keep server timestamps intact; measure response age without trusting the PC wall clock. */
export function rememberResearchClock<T extends object>(value: T, serverDate: string | null, startedAt: number): T {
  const serverAt = serverDate === null ? NaN : Date.parse(serverDate)
  const receivedAt = performance.now()
  if (Number.isFinite(serverAt) && Number.isFinite(startedAt) && receivedAt >= startedAt) {
    // HTTP Date has second precision. Count the full request duration conservatively.
    clocks.set(value, { serverAt: serverAt + 1000 + receivedAt - startedAt, receivedAt })
  }
  return value
}

export function researchNow(value: object | null | undefined, fallback = Date.now()): number {
  const clock = value ? clocks.get(value) : undefined
  return clock ? clock.serverAt + Math.max(0, performance.now() - clock.receivedAt) : fallback
}
