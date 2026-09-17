import { describe, expect, it, vi } from 'vitest'

import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { MarketCatalogProvider } from '@/services/market/explorer/MarketCatalogProvider'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketDetailSnapshot, RealtimeMarketState } from '@/types/marketDetail'
import { MarketDataService } from './marketDataService'
import { rememberInstrument } from './instrumentRegistry'

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
    expect(pending).toHaveLength(2)
    firstController.abort()
    pending[0].resolve(catalog) // Simulate a provider that ignores the signal.
    pending[1].resolve(catalog)
    await firstOutcome
    await expect(second).resolves.toBe(catalog)
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
