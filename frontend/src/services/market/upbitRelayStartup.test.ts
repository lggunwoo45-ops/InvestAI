import { afterEach, expect, it, vi } from 'vitest'
import { MarketDataService } from './marketDataService'
import type { RealtimeMarketState } from '@/types/marketDetail'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('cold relay analysis loads all three histories without browser pacing and shares a single live feed', async () => {
  vi.useFakeTimers(); vi.setSystemTime(Date.parse('2026-10-20T02:00:00Z'))
  vi.stubEnv('VITE_UPBIT_RELAY_URL', 'https://quotes.example/api/upbit')
  class Source extends EventTarget {
    static instances: Source[] = []
    close = vi.fn()
    constructor() { super(); Source.instances.push(this) }
    emit(type: string, data: unknown) { this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) })) }
  }
  vi.stubGlobal('EventSource', Source)
  const socket = vi.fn(); vi.stubGlobal('WebSocket', socket)
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('ticker/all')
    ? [{ market: 'KRW-BTC', trade_price: 100, signed_change_rate: .01, acc_trade_price_24h: 1000 }]
    : [{ candle_date_time_utc: '2026-10-19T00:00:00', opening_price: 90, high_price: 110, low_price: 80, trade_price: 100, candle_acc_trade_volume: 2 }])))
  vi.stubGlobal('fetch', fetcher)
  const service = new MarketDataService()
  const catalog = await service.getMarketCatalog('upbit-krw', 'live')
  const instrument = catalog.instruments[0], states = new Map<string, RealtimeMarketState>()
  const stops = (['1D', '1H', '4H'] as const).map(timeframe => service.subscribe({ instrument, timeframe, mode: 'live', onState: state => states.set(timeframe, state) }))
  await vi.advanceTimersByTimeAsync(0)
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect([...states.values()].every(state => state.snapshot?.candles.length === 1)).toBe(true)
  expect(Source.instances).toHaveLength(1); expect(socket).not.toHaveBeenCalled()
  const source = Source.instances[0]
  source.emit('status', { status: 'live', attempt: 0 })
  expect([...states.values()].every(state => state.connection.status === 'connecting')).toBe(true)
  source.emit('quote', { ageMs: 2000, message: { type: 'ticker', code: 'KRW-BTC', trade_timestamp: Date.now(), timestamp: Date.now(), trade_price: 105, opening_price: 100, high_price: 110, low_price: 95, acc_trade_volume: 123 } })
  await vi.advanceTimersByTimeAsync(0)
  expect([...states.values()].every(state => state.connection.status === 'live' && state.connection.lastUpdatedAt === Date.now() - 2000)).toBe(true)
  stops[0](); stops[1]()
  expect(source.close).not.toHaveBeenCalled()
  stops[2]()
  // No idle relay feeds occupy scarce HTTP/1 browser connection slots.
  expect(source.close).toHaveBeenCalled()
})
