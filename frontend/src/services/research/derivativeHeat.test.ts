import { expect, it } from 'vitest'
import { derivativeHeat } from './derivativeHeat'
import type { DerivativeSeries } from './derivativesHistory'
const HOUR = 3_600_000, at = 1_800_000_000_000, now = at + 10_000
function series(metric: DerivativeSeries['metric']): DerivativeSeries {
  const step = (metric === 'funding' ? 8 : 1) * HOUR, count = metric === 'funding' ? 22 : 169
  const points = Array.from({ length: count }, (_, i) => ({ at: at - (count - i - 1) * step, knownAt: at - (count - i - 1) * step + 1000, value: metric === 'funding' ? .0001 : 100 }))
  return { metric, unit: metric === 'funding' ? 'rate' : 'BTC', status: 'available', attemptedAt: now, succeededAt: now, firstAt: points[0]!.at, lastAt: at, gaps: metric === 'funding' ? null : [], points }
}
it('places a flat series at 50 and excludes the newest observation from its own reference set', () => {
  const s = series('openInterest')
  expect(derivativeHeat(s, 7, now)).toMatchObject({ percentile: 50, band: 'usual', samples: 167 })
  s.points.at(-1)!.value = 101
  expect(derivativeHeat(s, 7, now).percentile).toBe(100)
  s.points.at(-1)!.value = 99
  expect(derivativeHeat(s, 7, now).percentile).toBe(0)
})
it('compares funding magnitude while retaining the direction and observed settlement interval', () => {
  const s = series('funding'); s.points.at(-1)!.value = -.0002
  expect(derivativeHeat(s, 7, now)).toMatchObject({ latest: -.0002, percentile: 100, fundingIntervalHours: 8 })
})
it('does not label seven days of observations as a 30 or 90 day comparison', () => {
  for (const metric of ['funding', 'openInterest'] as const) for (const days of [30, 90]) {
    const reading = derivativeHeat(series(metric), days, now)
    expect(reading.percentile).toBeNull(); expect(reading.reason).toContain(`${days}일`)
  }
})
it('uses actual sample density as well as date span for hourly OI', () => {
  const s = series('openInterest'); s.points = s.points.filter((_, i) => i % 3 === 0)
  expect(derivativeHeat(s, 7, now).percentile).toBeNull()
})
it('rejects mixed settlement intervals or holes instead of inventing comparable funding costs', () => {
  const s = series('funding'); s.points.splice(10, 1)
  expect(derivativeHeat(s, 7, now).reason).toContain('간격')
  expect(derivativeHeat(s, 7, now).percentile).toBeNull()
})
it('suppresses stale, failed and absent data without showing a zero score', () => {
  const s = series('openInterest')
  for (const reading of [derivativeHeat(s, 7, now, true), derivativeHeat({ ...s, status: 'stale' }, 7, now), derivativeHeat(s, 7, now + 3 * HOUR), derivativeHeat({ ...s, points: [] }, 7, now)]) expect(reading.percentile).toBeNull()
})
it('rejects duplicate observations and values not known by the calculation time', () => {
  const s = series('openInterest'); s.points.at(-1)!.knownAt = now + 1
  expect(derivativeHeat(s, 7, now).percentile).toBeNull()
  s.points.at(-1)!.knownAt = now; s.points.push(s.points.at(-1)!)
  expect(derivativeHeat(s, 7, now).percentile).toBeNull()
})
