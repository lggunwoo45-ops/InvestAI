import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { ProviderStreamEvent } from '@/services/market/contracts/RealtimeMarketProvider'
import type { MarketCatalogProvider } from '@/services/market/explorer/MarketCatalogProvider'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketDetailSnapshot, RealtimeMarketState } from '@/types/marketDetail'
import { MarketDataService } from './marketDataService'
import { rememberInstrument } from './instrumentRegistry'
import { UpbitRequestError } from './providers/upbitRequest'

const instrument: MarketInstrument = {
  id: 'binance-btc', marketId: 'binance-futures', symbol: 'BTCUSDT', name: 'Bitcoin Perpetual', quoteCurrency: 'USDT', lastPrice: 100_000, change24hPercent: 1, volume24h: 1_000,
}

const snapshot: MarketDetailSnapshot = {
  instrument,
  timeframe: '1m',
  candles: [{ timestamp: 1_700_000_000_000, open: 99_000, high: 101_000, low: 98_500, close: 100_000, volume: 12 }],
  orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 },
  recentTrades: [],
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

function createProvider(id: string, supports: boolean): RealtimeMarketProvider {
  return {
    id,
    supports: () => supports,
    loadSnapshot: vi.fn().mockResolvedValue(snapshot),
    subscribe: vi.fn((_instrument, _timeframe, initialSnapshot, onEvent) => {
      onEvent({ status: id === 'mock' ? 'mock' : 'live', snapshot: initialSnapshot })
      return vi.fn()
    }),
  }
}

describe('MarketDataService', () => {
  it('waits for the relay cooldown before loading again and cancels recovery when leaving', async () => {
    vi.useFakeTimers()
    const provider = createProvider('live', true)
    provider.loadSnapshot = vi.fn().mockRejectedValue(new UpbitRequestError('rate-limit', 429, 60))
    const service = new MarketDataService([provider], createProvider('mock', true))
    const states: RealtimeMarketState[] = []
    const stop = service.subscribe({ instrument, timeframe: '1m', mode: 'live', onState: state => states.push(state) })
    await vi.advanceTimersByTimeAsync(59_999)
    expect(provider.loadSnapshot).toHaveBeenCalledOnce()
    expect(states.at(-1)?.connection.message).toContain('60s')
    await vi.advanceTimersByTimeAsync(1)
    expect(provider.loadSnapshot).toHaveBeenCalledTimes(2)
    stop(); await vi.advanceTimersByTimeAsync(60_000)
    expect(provider.loadSnapshot).toHaveBeenCalledTimes(2)
  })

  it('retains the quote receipt and exchange clock across book-only updates', async () => {
    const provider = createProvider('live', true)
    let emit: (event: ProviderStreamEvent) => void = () => {}
    provider.subscribe = (_instrument, _frame, _snapshot, onEvent) => { emit = onEvent; return () => {} }
    const states: RealtimeMarketState[] = []
    const service = new MarketDataService([provider], createProvider('mock', true))
    const stop = service.subscribe({ instrument, timeframe: '1m', mode: 'live', onState: state => states.push(state) })
    await vi.waitFor(() => expect(states.at(-1)?.snapshot).toBe(snapshot))
    emit({ snapshot, status: 'live', quoteUpdatedAt: 1000, marketTime: 700 })
    emit({ snapshot, quoteUpdatedAt: null })
    expect(states.at(-1)?.connection).toMatchObject({ lastUpdatedAt: 1000, marketTime: 700 })
    stop()
  })
  it('keeps display-only cached catalogs separate from fresh results, venue and mode', async () => {
    const started = Date.parse('2026-10-20T00:00:00Z')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(started)
    try {
      const catalog: MarketCatalog = { venue: 'upbit-krw', instruments: [], source: 'live', fetchedAt: started }
      const provider: MarketCatalogProvider = { id: 'controlled', supports: () => true, load: vi.fn().mockResolvedValueOnce(catalog).mockRejectedValue(new Error('Temporary failure')) }
      const service = new MarketDataService([], createProvider('mock', true), [provider])
      await service.getMarketCatalog('upbit-krw', 'live')
      clock.mockReturnValue(started + 61_000)
      await expect(service.getMarketCatalog('upbit-krw', 'live')).rejects.toThrow('Temporary failure')
      expect(service.getRecentCatalog('upbit-krw', 'live')).toBe(catalog)
      expect(service.getRecentCatalog('upbit-btc', 'live')).toBeNull()
      expect(service.getRecentCatalog('upbit-krw', 'mock')).toBeNull()
      clock.mockReturnValue(started + 300_001)
      expect(service.getRecentCatalog('upbit-krw', 'live')).toBeNull()
      clock.mockReturnValue(started - 1)
      expect(service.getRecentCatalog('upbit-krw', 'live')).toBeNull()
    } finally { clock.mockRestore() }
  })
  it('does not let one aborted catalog request poison another caller', async () => {
    const pending: Array<{ resolve: (catalog: MarketCatalog) => void }> = []
    const catalog: MarketCatalog = { venue: 'upbit-krw', instruments: [], source: 'live', fetchedAt: 1 }
    const provider: MarketCatalogProvider = {
      id: 'controlled catalog', supports: () => true,
      load: () => new Promise<MarketCatalog>((resolve) => { pending.push({ resolve }) }),
    }
    const service = new MarketDataService([], createProvider('mock', true), [provider])
    const firstController = new AbortController()
    const secondController = new AbortController()
    const first = service.getMarketCatalog('upbit-krw', 'live', false, firstController.signal)
    const second = service.getMarketCatalog('upbit-krw', 'live', false, secondController.signal)
    const firstOutcome = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    expect(pending).toHaveLength(1)
    firstController.abort()
    pending[0].resolve(catalog) // Simulate a provider that ignores the signal.
    await firstOutcome
    await expect(second).resolves.toBe(catalog)
  })

  it('cancels abandoned shared work and rejects late results without populating the cache', async () => {
    let resolve!: (catalog: MarketCatalog) => void
    let sharedSignal: AbortSignal | undefined
    const provider: MarketCatalogProvider = { id: 'controlled', supports: () => true, load: vi.fn((_venue, signal) => {
      sharedSignal = signal
      return new Promise<MarketCatalog>(done => { resolve = done })
    }) }
    const service = new MarketDataService([], createProvider('mock', true), [provider])
    const controller = new AbortController()
    const request = service.getMarketCatalog('upbit-krw', 'live', false, controller.signal)
    const outcome = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    controller.abort()
    expect(sharedSignal?.aborted).toBe(true)
    resolve({ venue: 'upbit-krw', source: 'live', instruments: [], fetchedAt: Date.now() })
    await outcome
    expect(service.getRecentCatalog('upbit-krw', 'live')).toBeNull()
  })

  it('shares one batch for all Upbit quotes and refreshes all caches together on force or expiry', async () => {
    vi.useFakeTimers()
    const venues = ['upbit-krw', 'upbit-btc', 'upbit-usdt'] as const
    const loadAll = vi.fn(async () => venues.map(venue => ({ venue, instruments: [], source: 'live' as const, fetchedAt: Date.now() })))
    const provider: MarketCatalogProvider = { id: 'batch', supports: (_venue, mode) => mode === 'live', load: vi.fn(), loadAll }
    const service = new MarketDataService([], createProvider('mock', true), [provider])
    const catalogs = await Promise.all(venues.map(venue => service.getMarketCatalog(venue, 'live', false, new AbortController().signal)))
    expect(loadAll).toHaveBeenCalledOnce()
    expect(catalogs.map(catalog => catalog.venue)).toEqual(venues)
    await service.getMarketCatalog('upbit-btc', 'live')
    expect(loadAll).toHaveBeenCalledOnce()
    await service.getMarketCatalog('upbit-krw', 'live', true)
    expect(loadAll).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60_001)
    await service.getMarketCatalog('upbit-usdt', 'live')
    expect(loadAll).toHaveBeenCalledTimes(3)
    expect(service.getRecentCatalog('upbit-krw', 'mock')).toBeNull()
  })

  it('shares snapshot loading and releases only after the last consumer leaves', async () => {
    const provider = createProvider('live', true)
    const stopProvider = vi.fn()
    provider.subscribe = vi.fn((_instrument, _frame, initial, onEvent) => { onEvent({ snapshot: initial, status: 'live' }); return stopProvider })
    const service = new MarketDataService([provider], createProvider('mock', true))
    const first = vi.fn(), second = vi.fn()
    const stopFirst = service.subscribe({ instrument, timeframe: '1m', mode: 'live', onState: first })
    const stopSecond = service.subscribe({ instrument, timeframe: '1m', mode: 'live', onState: second })
    await Promise.resolve()
    expect(provider.loadSnapshot).toHaveBeenCalledOnce()
    expect(provider.subscribe).toHaveBeenCalledOnce()
    expect(second.mock.lastCall?.[0].connection.status).toBe('live')
    stopFirst(); stopFirst()
    expect(stopProvider).not.toHaveBeenCalled()
    stopSecond()
    expect(stopProvider).toHaveBeenCalledOnce()
  })

  it('reuses a live Upbit analysis during navigation without changing freshness timestamps, then expires it', async () => {
    vi.useFakeTimers()
    const upbit = { ...instrument, id: 'upbit-btc', marketId: 'upbit' as const, quoteCurrency: 'KRW' as const }
    const provider = createProvider('upbit', true)
    const stopProvider = vi.fn()
    let emit!: (event: ProviderStreamEvent) => void
    provider.subscribe = (_instrument, _frame, _snapshot, onEvent) => { emit = onEvent; return stopProvider }
    const service = new MarketDataService([provider], createProvider('mock', true))
    const start = (onState = vi.fn()) => service.subscribe({ instrument: upbit, timeframe: '1H', mode: 'live', onState })
    const stop = start()
    await Promise.resolve()
    emit({ snapshot, status: 'live', quoteUpdatedAt: 1000, marketTime: 900 })
    stop()
    await vi.advanceTimersByTimeAsync(10_000)
    emit({ snapshot, quoteUpdatedAt: 2000, marketTime: 1900 })
    const returned = vi.fn()
    const stopAgain = start(returned)
    expect(returned.mock.lastCall?.[0].connection).toMatchObject({ lastUpdatedAt: 2000, marketTime: 1900 })
    expect(provider.loadSnapshot).toHaveBeenCalledOnce()
    expect(stopProvider).not.toHaveBeenCalled()
    stopAgain()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(stopProvider).toHaveBeenCalledOnce()
    const stopNew = start()
    expect(provider.loadSnapshot).toHaveBeenCalledTimes(2)
    stopNew()
  })

  it('isolates venues, timeframes and modes and cancels pending loads immediately', () => {
    const signals: AbortSignal[] = []
    const provider = createProvider('live', true)
    provider.loadSnapshot = vi.fn((_instrument, _frame, signal) => { signals.push(signal!); return new Promise<MarketDetailSnapshot>(() => {}) })
    const mock = createProvider('mock', true)
    const service = new MarketDataService([provider], mock)
    const stops = [
      service.subscribe({ instrument, timeframe: '1H', mode: 'live', onState: vi.fn() }),
      service.subscribe({ instrument, timeframe: '4H', mode: 'live', onState: vi.fn() }),
      service.subscribe({ instrument: { ...instrument, marketId: 'binance-spot' }, timeframe: '1H', mode: 'live', onState: vi.fn() }),
      service.subscribe({ instrument, timeframe: '1H', mode: 'mock', onState: vi.fn() }),
    ]
    expect(provider.loadSnapshot).toHaveBeenCalledTimes(3)
    expect(mock.loadSnapshot).toHaveBeenCalledOnce()
    stops.forEach(stop => stop())
    expect(signals.every(signal => signal.aborted)).toBe(true)
  })

  it('closes idle streams on connection loss and bounds retained streams to three', async () => {
    vi.useFakeTimers()
    const provider = createProvider('upbit', true)
    const emitters: Array<(event: ProviderStreamEvent) => void> = []
    const cleanups: Array<ReturnType<typeof vi.fn>> = []
    provider.subscribe = (_instrument, _frame, initial, emit) => {
      emitters.push(emit)
      const cleanup = vi.fn(); cleanups.push(cleanup)
      emit({ status: 'live', snapshot: initial })
      return cleanup
    }
    const service = new MarketDataService([provider], createProvider('mock', true))
    for (let index = 0; index < 4; index += 1) {
      const stop = service.subscribe({ instrument: { ...instrument, marketId: 'upbit', id: `upbit-${index}` }, timeframe: '1H', mode: 'live', onState: vi.fn() })
      await Promise.resolve()
      stop()
    }
    expect(cleanups[0]).toHaveBeenCalledOnce()
    expect(cleanups[1]).not.toHaveBeenCalled()
    emitters[1]({ status: 'reconnecting' })
    expect(cleanups[1]).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(cleanups.every(cleanup => cleanup.mock.calls.length === 1)).toBe(true)
  })

  it('resolves Explorer Upbit and Binance Spot identities for dashboard and recently viewed', async () => {
    const upbit: MarketInstrument = { ...instrument, id: 'upbit-sprint72-test', marketId: 'upbit', symbol: 'TEST/KRW', providerSymbol: 'KRW-TEST', marketType: 'upbit-krw', quoteCurrency: 'KRW' }
    const spot: MarketInstrument = { ...instrument, id: 'binance-spot-sprint72testusdt', marketId: 'binance-spot', symbol: 'TESTUSDT', providerSymbol: 'TESTUSDT', marketType: 'binance-spot' }
    rememberInstrument(upbit)
    rememberInstrument(spot)
    const service = new MarketDataService()
    const resolved = await service.resolveInstruments([upbit.id, spot.id], 'mock')
    expect(resolved.get(upbit.id)?.providerSymbol).toBe('KRW-TEST')
    expect(resolved.get(spot.id)?.providerSymbol).toBe('TESTUSDT')
    expect(service.getKnownInstruments([upbit.id, spot.id]).size).toBe(2)
  })

  it('leaves genuinely unknown IDs unresolved for the Unavailable UI fallback', async () => {
    const service = new MarketDataService()
    expect((await service.resolveInstruments(['deleted-symbol'], 'mock')).has('deleted-symbol')).toBe(false)
  })

  it('routes live instruments through the supported provider', async () => {
    const liveProvider = createProvider('live-provider', true)
    const mockProvider = createProvider('mock', true)
    const service = new MarketDataService([liveProvider], mockProvider)
    const states: RealtimeMarketState[] = []

    const unsubscribe = service.subscribe({ instrument, timeframe: '1m', mode: 'live', onState: (state) => states.push(state) })
    await vi.waitFor(() => expect(states.at(-1)?.connection.status).toBe('live'))

    expect(liveProvider.loadSnapshot).toHaveBeenCalledOnce()
    expect(mockProvider.loadSnapshot).not.toHaveBeenCalled()
    expect(states.at(-1)?.snapshot?.instrument.symbol).toBe('BTCUSDT')
    unsubscribe()
  })

  it('keeps unsupported live markets operational through mock fallback', async () => {
    const liveProvider = createProvider('live-provider', false)
    const mockProvider = createProvider('mock', true)
    const service = new MarketDataService([liveProvider], mockProvider)
    const states: RealtimeMarketState[] = []

    const unsubscribe = service.subscribe({ instrument: { ...instrument, marketId: 'us-stock' }, timeframe: '1H', mode: 'live', onState: (state) => states.push(state) })
    await vi.waitFor(() => expect(states.at(-1)?.connection.status).toBe('mock'))

    expect(states.at(-1)?.connection.effectiveMode).toBe('mock')
    expect(states.at(-1)?.connection.message).toContain('Live data is unavailable')
    unsubscribe()
  })
})
