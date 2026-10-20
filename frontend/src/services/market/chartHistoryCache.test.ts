import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ChartHistoryCache, CHART_CACHE_KEY } from './chartHistoryCache'
import type { MarketDetailSnapshot } from '@/types/marketDetail'

const snapshot: MarketDetailSnapshot = {
  instrument: { id: 'upbit-btc', marketId: 'upbit', providerSymbol: 'KRW-BTC', symbol: 'BTC/KRW', quoteCurrency: 'KRW', name: 'BTC', lastPrice: 100, change24hPercent: 1, volume24h: 1000 },
  timeframe: '1H', candles: [{ timestamp: 1700000000000, open: 100, high: 110, low: 90, close: 105, volume: 2 }],
  orderbook: { symbolId: 'upbit-btc', asks: [], bids: [], spread: 0 }, recentTrades: [],
}
beforeEach(() => localStorage.clear())
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
it('restores only the matching recent history after reload, without replaying trades or a receipt timestamp', () => {
  const cache = new ChartHistoryCache()
  cache.put(snapshot)
  const preview = new ChartHistoryCache().get(snapshot.instrument, '1H')
  expect(preview?.snapshot.candles).toEqual(snapshot.candles)
  expect(preview?.snapshot.recentTrades).toEqual([])
  expect(new ChartHistoryCache().get(snapshot.instrument, '4H')).toBeNull()
  expect(cache.get({ ...snapshot.instrument, quoteCurrency: 'BTC' }, '1H')).toBeNull()
  expect(cache.get({ ...snapshot.instrument, id: 'upbit-eth' }, '1H')).toBeNull()
})
it('expires old/future entries and bounds history to 12 identities', () => {
  vi.useFakeTimers()
  const cache = new ChartHistoryCache()
  cache.put(snapshot)
  vi.setSystemTime(Date.now() - 1)
  expect(cache.get(snapshot.instrument, '1H')).toBeNull()
  vi.setSystemTime(Date.now() + 900_002)
  expect(new ChartHistoryCache().get(snapshot.instrument, '1H')).toBeNull()
  for (let index = 0; index < 13; index++) cache.put({ ...snapshot, instrument: { ...snapshot.instrument, id: `upbit-${index}` } })
  expect(JSON.parse(localStorage.getItem(CHART_CACHE_KEY)!).entries).toHaveLength(12)
  expect(cache.get({ ...snapshot.instrument, id: 'upbit-0' }, '1H')).toBeNull()
})
it('ignores corrupt storage/invalid bars and remains usable when writes fail', () => {
  localStorage.setItem(CHART_CACHE_KEY, '{broken')
  const cache = new ChartHistoryCache()
  expect(cache.get(snapshot.instrument, '1H')).toBeNull()
  cache.put({ ...snapshot, candles: [{ ...snapshot.candles[0], high: 1 }] })
  expect(cache.get(snapshot.instrument, '1H')).toBeNull()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  cache.put(snapshot)
  expect(cache.get(snapshot.instrument, '1H')?.snapshot.candles).toEqual(snapshot.candles)
})
