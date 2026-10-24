import { afterEach, expect, it, vi } from 'vitest'
import { fetchResearch, fetchResearchHistory } from './researchClient'
import { rememberResearchClock, researchNow } from './researchClock'
import { sourceData } from './researchModel'

const serverAt = Date.UTC(2026, 9, 24, 14, 0)
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each([310_000, -310_000])('uses server time with a PC clock skew of %i ms and still expires old data', async skew => {
  let elapsed = 100
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  vi.spyOn(Date, 'now').mockReturnValue(serverAt + skew)
  const payload = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: serverAt,
    sources: { mark: { status: 'available', source: 'Binance', receivedAt: serverAt, serverTime: serverAt,
      data: { markPrice: '100', time: serverAt } } } }
  vi.stubGlobal('fetch', vi.fn(async () => {
    elapsed += 200
    return new Response(JSON.stringify(payload), { headers: { Date: new Date(serverAt).toUTCString() } })
  }))
  const snapshot = await fetchResearch('BTC')
  expect(sourceData(snapshot, 'mark', researchNow(snapshot))).toEqual(payload.sources.mark.data)
  expect(snapshot.sources.mark.receivedAt).toBe(serverAt)
  elapsed += 181_000
  expect(sourceData(snapshot, 'mark', researchNow(snapshot))).toBeNull()
})

it('does not refresh cached history timestamps or depend on later PC clock changes', async () => {
  let elapsed = 100
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  const wallClock = vi.spyOn(Date, 'now').mockReturnValue(serverAt + 310_000)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    version: 1, asset: 'BTC', timeframe: '1h', requested: 1000, fetchedAt: serverAt - 30_000,
    asOf: serverAt, source: 'Binance', candles: [],
  }), { headers: { Date: new Date(serverAt).toUTCString() } })))
  const history = await fetchResearchHistory('BTC', '1h', 1000)
  expect(researchNow(history) - history.fetchedAt).toBe(31_000)
  wallClock.mockReturnValue(serverAt - 600_000)
  elapsed += 150_000
  expect(researchNow(history) - history.fetchedAt).toBe(181_000)
})

it('falls back without fabricating a server clock when the response has no valid Date', () => {
  const data = {}
  rememberResearchClock(data, 'invalid', performance.now())
  expect(researchNow(data, 123)).toBe(123)
  expect(researchNow(null, 456)).toBe(456)
})
