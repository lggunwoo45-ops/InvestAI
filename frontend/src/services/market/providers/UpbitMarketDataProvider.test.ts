import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { upbitMarketDataProvider } from './UpbitMarketDataProvider'
import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'
import type { ProviderStreamEvent } from '../contracts/RealtimeMarketProvider'

// Pacing is tested separately using fake time; provider tests inspect mapping.
vi.mock('./upbitRequestGate', () => ({ upbitRequestGate: { run: (operation: () => unknown) => Promise.resolve(operation()), defer: vi.fn() } }))
const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, volume24h: 1000, change24hPercent: 1 }
afterEach(() => vi.unstubAllGlobals())
it('loads history with one REST call and candle start timestamps', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ timestamp: 1704070799999, candle_date_time_utc: '2024-01-01T00:00:00', opening_price: 90, high_price: 110, low_price: 80, trade_price: 100, candle_acc_trade_volume: 2 }] })
  vi.stubGlobal('fetch', fetcher)
  const snapshot = await upbitMarketDataProvider.loadSnapshot(instrument, '1H')
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toContain('/candles/minutes/60?market=KRW-BTC')
  expect(snapshot.candles[0].timestamp).toBe(Date.parse('2024-01-01T00:00:00Z'))
  expect(snapshot.orderbook.asks).toEqual([]); expect(snapshot.recentTrades).toEqual([])
})
it('requests initial stream snapshots and avoids unsupported daily candle channel', async () => {
  const messages: unknown[] = []
  class FakeSocket {
    addEventListener(event: string, callback: (event: unknown) => void) { if (event === 'open') queueMicrotask(() => callback({})) }
    send(value: string) { messages.push(JSON.parse(value)) }
    close() {}
  }
  vi.stubGlobal('WebSocket', FakeSocket)
  const stop = upbitMarketDataProvider.subscribe(instrument, '1D', { instrument, timeframe: '1D', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } }, vi.fn())
  await vi.waitFor(() => expect(messages).toHaveLength(1))
  expect(messages[0]).toEqual(expect.arrayContaining([{ type: 'ticker', codes: ['KRW-BTC'] }, { type: 'trade', codes: ['KRW-BTC'] }, { type: 'orderbook', codes: ['KRW-BTC'] }]))
  expect(JSON.stringify(messages)).not.toContain('candle.1d')
  stop()
})

describe('shared Upbit analysis connection', () => {
  const now = Date.parse('2026-10-20T02:00:00Z')
  class Socket {
    static instances: Socket[] = []
    listeners = new Map<string, (event: MessageEvent) => void>()
    send = vi.fn()
    close = vi.fn(() => this.emit('close'))
    constructor() { Socket.instances.push(this) }
    addEventListener(type: string, callback: (event: MessageEvent) => void) { this.listeners.set(type, callback) }
    emit(type: string, data?: unknown) { this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(data) })) }
  }
  let stops: Array<() => void>
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); stops = []; Socket.instances = []; vi.stubGlobal('WebSocket', Socket) })
  afterEach(() => { stops.forEach(stop => stop()); vi.useRealTimers() })
  function subscribe(frame: ChartTimeframe, item = instrument) {
    const events: ProviderStreamEvent[] = []
    const snapshot: MarketDetailSnapshot = { instrument: item, timeframe: frame, candles: [], recentTrades: [], orderbook: { symbolId: item.id, asks: [], bids: [], spread: 0 } }
    const stop = upbitMarketDataProvider.subscribe(item, frame, snapshot, event => events.push(event))
    stops.push(stop)
    return { events, stop, latest: () => events.filter(e => e.snapshot).at(-1) }
  }
  async function open() { await vi.advanceTimersByTimeAsync(0); Socket.instances.at(-1)!.emit('open'); await vi.advanceTimersByTimeAsync(0) }
  async function message(data: unknown, socket = Socket.instances[0]) { socket.emit('message', data); await vi.advanceTimersByTimeAsync(0) }
  const ticker = () => ({ type: 'ticker', code: 'KRW-BTC', trade_timestamp: Date.now(), timestamp: Date.now(), trade_price: 105, opening_price: 100, high_price: 110, low_price: 95, acc_trade_volume: 123, signed_change_rate: .05, acc_trade_price_24h: 5000 })

  it('opens one socket for three timeframes, routes candle units and retains other subscribers on unsubscribe', async () => {
    const hourly = subscribe('1H'), four = subscribe('4H'), daily = subscribe('1D')
    await open()
    expect(Socket.instances).toHaveLength(1)
    expect(JSON.parse(Socket.instances[0].send.mock.calls[0][0])).toEqual(expect.arrayContaining([{ type: 'candle.60m', codes: ['KRW-BTC'] }, { type: 'candle.240m', codes: ['KRW-BTC'] }]))
    expect(hourly.events.some(e => e.status === 'live')).toBe(false)
    await message(ticker())
    for (const row of [hourly, four, daily]) expect(row.latest()).toMatchObject({ status: 'live', quoteUpdatedAt: now, snapshot: { instrument: { lastPrice: 105 } } })
    await message({ ...ticker(), type: 'candle.60m', candle_date_time_utc: '2026-10-20T02:00:00', candle_acc_trade_volume: 6 })
    expect(hourly.latest()?.snapshot?.candles).toHaveLength(1)
    expect(four.latest()?.snapshot?.candles).toHaveLength(0)
    expect(daily.latest()?.snapshot?.candles[0].volume).toBe(123)
    hourly.stop()
    expect(Socket.instances[0].close).not.toHaveBeenCalled()
    await message({ ...ticker(), trade_price: 106 })
    expect(four.latest()?.snapshot?.instrument.lastPrice).toBe(106)
    four.stop(); daily.stop()
    expect(Socket.instances[0].close).toHaveBeenCalledOnce()
  })

  it('does not mark unknown, malformed, stale or another market messages as fresh quotes', async () => {
    const hourly = subscribe('1H')
    await open()
    for (const data of [null, { type: 'unknown' }, { ...ticker(), code: 'KRW-ETH' }, { ...ticker(), trade_price: 'bad' }, { ...ticker(), trade_timestamp: now - 91_000 }, { ...ticker(), trade_timestamp: now + 61_000 }]) await message(data)
    expect(hourly.latest()).toBeUndefined()
    await message({ type: 'orderbook', code: 'KRW-BTC', orderbook_units: [] })
    expect(hourly.latest()?.quoteUpdatedAt).toBeNull()
    expect(hourly.events.some(e => e.status === 'live')).toBe(false)
  })

  it('separates local receipt freshness from the exchange clock when the PC is five minutes ahead', async () => {
    const hourly = subscribe('1H'); await open()
    await message({ ...ticker(), timestamp: now - 310_000, trade_timestamp: now - 310_500 })
    expect(hourly.latest()).toMatchObject({ status: 'live', quoteUpdatedAt: now, marketTime: now - 310_000 })
    await message({ ...ticker(), timestamp: now - 310_000, trade_timestamp: now - 401_000 })
    expect(hourly.latest()?.quoteUpdatedAt).toBe(now)
  })

  it('replays recent absolute quotes for late subscribers without another handshake', async () => {
    subscribe('1H'); await open(); await message(ticker())
    const daily = subscribe('1D')
    expect(daily.latest()?.snapshot?.instrument.lastPrice).toBe(105)
    expect(Socket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(89_000)
    await message({ type: 'orderbook', code: 'KRW-BTC', orderbook_units: [] })
    await vi.advanceTimersByTimeAsync(2_000)
    const four = subscribe('4H')
    expect(four.events.some(e => e.status === 'live')).toBe(false)
  })

  it('uses full UTC day totals and stable trade IDs instead of accumulating partial or duplicate daily trades', async () => {
    const daily = subscribe('1D'); await open(); await message(ticker())
    const trade = { ...ticker(), type: 'trade', sequential_id: 1, trade_volume: 3, ask_bid: 'BID' }
    await message(trade); await message(trade)
    expect(daily.latest()?.snapshot?.recentTrades).toHaveLength(1)
    expect(daily.latest()?.snapshot?.candles[0].volume).toBe(123)
    await message({ ...ticker(), acc_trade_volume: 140 })
    expect(daily.latest()?.snapshot?.candles[0].volume).toBe(140)
  })

  it('reloads history after a reconnect and excludes quotes until that refresh completes', async () => {
    const daily = subscribe('1D'); await open(); await message(ticker())
    let resolve: (value: unknown) => void = () => {}
    const fetcher = vi.fn(() => new Promise(value => { resolve = value }))
    vi.stubGlobal('fetch', fetcher)
    Socket.instances[0].emit('close')
    await vi.advanceTimersByTimeAsync(1_000); Socket.instances[1].emit('open'); await vi.advanceTimersByTimeAsync(0)
    expect(fetcher).toHaveBeenCalledOnce()
    await message({ ...ticker(), trade_price: 999 }, Socket.instances[1])
    expect(daily.latest()?.snapshot?.instrument.lastPrice).toBe(105)
    resolve({ ok: true, json: async () => [{ candle_date_time_utc: '2026-10-19T00:00:00', opening_price: 90, high_price: 110, low_price: 80, trade_price: 100, candle_acc_trade_volume: 1000 }] })
    await vi.advanceTimersByTimeAsync(0)
    await message(ticker(), Socket.instances[1])
    expect(daily.latest()?.snapshot?.candles).toHaveLength(2)
    expect(daily.latest()?.status).toBe('live')
  })

  it('reconnects on an exchange error without emitting a successful snapshot', async () => {
    const hourly = subscribe('1H'); await open()
    await message({ error: { name: 'TOO_MANY_REQUEST' } })
    expect(hourly.latest()).toBeUndefined()
    expect(hourly.events.at(-1)?.status).toBe('reconnecting')
    await vi.advanceTimersByTimeAsync(1000)
    expect(Socket.instances).toHaveLength(2)
  })

  it('isolates quote markets and aborts a pending history refresh on unsubscribe', async () => {
    const btc = subscribe('1D')
    subscribe('1D', { ...instrument, id: 'upbit-btc-eth', symbol: 'ETH/BTC', quoteCurrency: 'BTC', providerSymbol: 'BTC-ETH' })
    await vi.advanceTimersByTimeAsync(0)
    expect(Socket.instances).toHaveLength(2)
    Socket.instances[0].emit('open'); await message(ticker())
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_url, options) => { signal = options.signal; return new Promise(() => {}) }))
    Socket.instances[0].emit('close'); await vi.advanceTimersByTimeAsync(1000)
    Socket.instances[2].emit('open'); await vi.advanceTimersByTimeAsync(0)
    btc.stop()
    expect(signal?.aborted).toBe(true)
  })
})
