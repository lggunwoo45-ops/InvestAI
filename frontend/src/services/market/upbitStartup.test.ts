import { afterEach, expect, it, vi } from 'vitest'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { MarketDataService } from './marketDataService'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('paces a cold three-frame analysis in five operations and reuses a warm connection without new requests', async () => {
  vi.useFakeTimers()
  const started = Date.parse('2026-10-20T02:00:00Z')
  vi.setSystemTime(started)
  const operations: Array<{ kind: string; at: number }> = []
  class Socket {
    static instance: Socket
    listeners = new Map<string, (event: MessageEvent) => void>()
    constructor() { Socket.instance = this; operations.push({ kind: 'socket', at: Date.now() - started }) }
    addEventListener(type: string, callback: (event: MessageEvent) => void) { this.listeners.set(type, callback) }
    send() {}
    close() {}
    emit(type: string, data?: unknown) { this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(data) })) }
  }
  vi.stubGlobal('WebSocket', Socket)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    operations.push({ kind: url.includes('ticker/all') ? 'catalog' : 'history', at: Date.now() - started })
    return { ok: true, json: async () => url.includes('ticker/all')
      ? [{ market: 'KRW-BTC', trade_price: 100, signed_change_rate: .01, acc_trade_price_24h: 1000 }]
      : [{ candle_date_time_utc: '2026-10-20T01:00:00', opening_price: 90, high_price: 110, low_price: 80, trade_price: 100, candle_acc_trade_volume: 2 }] }
  }))
  const service = new MarketDataService()
  const catalogs = Promise.all((['upbit-krw', 'upbit-btc', 'upbit-usdt'] as const).map(venue => service.getMarketCatalog(venue, 'live', false, new AbortController().signal)))
  await vi.advanceTimersByTimeAsync(0)
  const instrument = (await catalogs)[0].instruments[0]
  const states = new Map<string, RealtimeMarketState>()
  const subscribe = () => (['1D', '1H', '4H'] as const).map(timeframe => service.subscribe({ instrument, timeframe, mode: 'live', onState: state => states.set(timeframe, state) }))
  const stops = subscribe()
  await vi.advanceTimersByTimeAsync(42_000)
  expect(operations).toEqual([
    { kind: 'catalog', at: 0 },
    { kind: 'history', at: 10_500 },
    { kind: 'history', at: 21_000 },
    { kind: 'history', at: 31_500 },
    { kind: 'socket', at: 42_000 },
  ])
  expect([...states.values()].every(state => state.connection.status === 'connecting')).toBe(true)
  Socket.instance.emit('open')
  Socket.instance.emit('message', { type: 'ticker', code: 'KRW-BTC', trade_timestamp: Date.now(), timestamp: Date.now(), trade_price: 105, opening_price: 100, high_price: 110, low_price: 95, acc_trade_volume: 123 })
  await vi.advanceTimersByTimeAsync(0)
  expect([...states.values()].every(state => state.connection.status === 'live')).toBe(true)
  stops.forEach(stop => stop())
  await vi.advanceTimersByTimeAsync(10_000)
  states.clear()
  const returned = subscribe()
  expect([...states.values()].every(state => state.connection.status === 'live' && state.connection.lastUpdatedAt === started + 42_000)).toBe(true)
  expect(operations).toHaveLength(5)
  returned.forEach(stop => stop())
  await vi.advanceTimersByTimeAsync(30_000)
})
