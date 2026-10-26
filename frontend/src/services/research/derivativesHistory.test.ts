import { afterEach, expect, it, vi } from 'vitest'
import { fetchDerivativesHistory, historyPaths, type DerivativesHistory } from './derivativesHistory'
vi.mock('./researchClient', () => ({ researchBase: () => '/api/research' }))
export const historyFixture = (days = 7): DerivativesHistory => {
  const hour = 3_600_000, at = Date.parse('2026-10-26T12:00:00Z'), points = [{ at: at - 2 * hour, value: 100, knownAt: at }, { at: at - hour, value: 102, knownAt: at }]
  return { version: 1, asset: 'BTC', days, fetchedAt: at, from: at - days * 24 * hour, to: at, source: 'Bybit USDT perpetual', retentionDays: 365, intervalMinutes: 15, backfillDays: 7, series: [
    { metric: 'funding', unit: 'rate', status: 'available', attemptedAt: at, succeededAt: at, firstAt: at - 2 * hour, lastAt: at - hour, gaps: null, points: points.map(p => ({ ...p, value: .0001 })) },
    { metric: 'openInterest', unit: 'BTC', status: 'available', attemptedAt: at, succeededAt: at, firstAt: at - 2 * hour, lastAt: at - hour, gaps: [{ from: at - days * 24 * hour, to: at - 3 * hour }], points },
  ] }
}
afterEach(() => vi.unstubAllGlobals())
it('validates stored point timestamps, source, asset, units, order and invalid numerical values', async () => {
  const fixture = historyFixture()
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture))); vi.stubGlobal('fetch', fetcher)
  expect((await fetchDerivativesHistory('BTC', 7)).series[1]!.points.length).toBe(2)
  expect(fetcher.mock.calls[0]![0]).toBe('/api/research/derivatives?asset=BTC&days=7')
  const bad: DerivativesHistory[] = []
  const unit = structuredClone(fixture); unit.series[1]!.unit = 'USD'; bad.push(unit)
  const future = structuredClone(fixture); future.series[1]!.points[0]!.knownAt = fixture.fetchedAt + 1; bad.push(future)
  const past = structuredClone(fixture); past.series[1]!.points[0]!.knownAt = 0; bad.push(past)
  const duplicate = structuredClone(fixture); duplicate.series[1]!.points.reverse(); bad.push(duplicate)
  const invalid = structuredClone(fixture); invalid.series[1]!.points[0]!.value = NaN; bad.push(invalid)
  for (const body of bad) { fetcher.mockResolvedValueOnce(new Response(JSON.stringify(body))); await expect(fetchDerivativesHistory('BTC', 7)).rejects.toThrow() }
})
it('breaks hourly chart paths across gaps and keeps an empty sample empty', () => {
  expect(historyPaths([], 0, 100, true)).toEqual([])
  const points = [0, 3_600_000, 10_800_000, 14_400_000].map(at => ({ at, value: 10, knownAt: at }))
  expect(historyPaths(points, 0, 20_000_000, true)).toHaveLength(2)
  expect(historyPaths(points, 0, 20_000_000, false)).toHaveLength(1)
})
