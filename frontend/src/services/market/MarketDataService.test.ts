import { describe, expect, it, vi } from 'vitest'

import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { MarketInstrument } from '@/types/market'
import type { MarketDetailSnapshot, RealtimeMarketState } from '@/types/marketDetail'
import { MarketDataService } from './marketDataService'

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
