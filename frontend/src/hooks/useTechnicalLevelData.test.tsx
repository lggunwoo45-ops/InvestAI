import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketInstrument } from '@/types/market'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { useTechnicalLevelData } from './useTechnicalLevelData'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1_000 }

vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: 'mock' }) }))

describe('useTechnicalLevelData', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('reads normalized daily candles through MarketDataService and cleans up the subscription', () => {
    let emit: ((state: RealtimeMarketState) => void) | null = null
    const unsubscribe = vi.fn()
    const subscribe = vi.spyOn(marketDataService, 'subscribe').mockImplementation((options) => {
      emit = options.onState
      return unsubscribe
    })
    const { result, unmount } = renderHook(() => useTechnicalLevelData(instrument))

    expect(result.current.isLoading).toBe(true)
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ instrument, timeframe: '1D', mode: 'mock' }))
    act(() => emit?.({
      snapshot: {
        instrument: { ...instrument, lastPrice: 103 },
        timeframe: '1D',
        candles: [{ timestamp: 1, open: 99, high: 104, low: 98, close: 103, volume: 12 }],
        orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 },
        recentTrades: [],
      },
      connection: { requestedMode: 'mock', effectiveMode: 'mock', status: 'mock', provider: 'test', reconnectAttempt: 0, lastUpdatedAt: 1, message: 'Mock' },
    }))

    expect(result.current).toMatchObject({ currentPrice: 103, dataQuality: 'mock', connectionStatus: 'mock', isLoading: false })
    expect(result.current.candles).toHaveLength(1)
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('does not subscribe when no instrument is selected', () => {
    const subscribe = vi.spyOn(marketDataService, 'subscribe')
    const { result } = renderHook(() => useTechnicalLevelData(null))
    expect(result.current).toEqual({ candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'idle', isLoading: false })
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('does not restart the daily subscription for quote-only instrument updates', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.spyOn(marketDataService, 'subscribe').mockReturnValue(unsubscribe)
    const { rerender, unmount } = renderHook(({ value }) => useTechnicalLevelData(value), { initialProps: { value: instrument } })
    rerender({ value: { ...instrument, lastPrice: 104, change24hPercent: 2, volume24h: 2_000 } })
    expect(subscribe).toHaveBeenCalledOnce()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
