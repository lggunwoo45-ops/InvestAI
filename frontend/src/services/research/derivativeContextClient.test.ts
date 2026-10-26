import { afterEach, expect, it, vi } from 'vitest'
import { fetchDerivativeContext, type DerivativeContext } from './derivativeContextClient'
import { DERIVATIVE_FILTER_VERSION } from './signalExplorer'
vi.mock('./researchClient', () => ({ researchBase: () => '/api/research' }))
const at = Date.parse('2026-10-26T12:00:00Z'), hour = 3_600_000
const fixture = (): DerivativeContext => ({ version: 1, method: DERIVATIVE_FILTER_VERSION, asset: 'BTC', timeframe: '1h', from: at, to: at, fetchedAt: at + 1000, firstStoredAt: at - hour, source: 'Bybit USDT perpetual', points: [{ at, funding: { at: at - hour, knownAt: at - 1, value: .0001 }, openInterest: { at: at - hour, knownAt: at - 1, value: 110, change24h: 10, previousAt: at - 25 * hour, previousKnownAt: at - 24 * hour, previousValue: 100 } }] })
afterEach(() => vi.unstubAllGlobals())
it('accepts validated point-in-time data and rejects future knowledge, wrong scope, units or inconsistent OI changes', async () => {
  const f = vi.fn(); vi.stubGlobal('fetch', f)
  f.mockResolvedValueOnce(new Response(JSON.stringify(fixture())))
  expect((await fetchDerivativeContext('BTC', '1h', at, at)).points).toHaveLength(1)
  const patches = [(v: DerivativeContext) => { v.asset = 'ETH' }, (v: DerivativeContext) => { v.method = 'latest' }, (v: DerivativeContext) => { v.points[0]!.funding!.knownAt = at + 1 }, (v: DerivativeContext) => { v.points[0]!.openInterest!.previousKnownAt = at + 1 }, (v: DerivativeContext) => { v.points[0]!.openInterest!.change24h = 50 }, (v: DerivativeContext) => { v.points[0]!.at += hour }, (v: DerivativeContext) => { v.points = [] }]
  for (const patch of patches) { const v = fixture(); patch(v); f.mockResolvedValueOnce(new Response(JSON.stringify(v))); await expect(fetchDerivativeContext('BTC', '1h', at, at)).rejects.toThrow() }
})
it('refuses invalid query scopes before requesting and rejects a failed source instead of returning price-only results', async () => {
  const f = vi.fn(); vi.stubGlobal('fetch', f)
  await expect(fetchDerivativeContext('BTC', '1h', at + 1, at + hour)).rejects.toThrow()
  expect(f).not.toHaveBeenCalled()
  f.mockResolvedValueOnce(new Response('{}', { status: 503 }))
  await expect(fetchDerivativeContext('BTC', '1h', at, at)).rejects.toThrow(/결과는 보류/)
})
