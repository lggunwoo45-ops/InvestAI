import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketInstrument } from '@/types/market'
import type { RealtimeMarketState } from '@/types/marketDetail'
import type { ChartTimeframe } from '@/types/marketDetail'
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
    expect(result.current).toEqual({ candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'idle', isLoading: false, recentTrades: [], updatedAt: null })
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('skips 100 orderbook-only updates but immediately publishes prices, trades, freshness and disconnects', () => {
    let emit!: (state: RealtimeMarketState) => void
    vi.spyOn(marketDataService, 'subscribe').mockImplementation(options => { emit = options.onState; return vi.fn() })
    let renders = 0
    const { result } = renderHook(() => { renders++; return useTechnicalLevelData(instrument) })
    let state: RealtimeMarketState = {
      snapshot: { instrument, timeframe: '1D', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } },
      connection: { requestedMode: 'live', effectiveMode: 'live', status: 'live', provider: 'test', reconnectAttempt: 0, lastUpdatedAt: 1000, marketTime: 2000, message: 'Live' },
    }
    act(() => emit(state))
    const initial = result.current
    const initialRenders = renders
    for (let i = 0; i < 100; i++) {
      state = { ...state, snapshot: { ...state.snapshot!, orderbook: { ...state.snapshot!.orderbook, spread: i } } }
      act(() => emit(state))
    }
    expect(renders - initialRenders).toBe(0)
    expect(result.current).toBe(initial)
    state = { ...state, snapshot: { ...state.snapshot!, instrument: { ...instrument, lastPrice: 105 } } }
    act(() => emit(state))
    expect(result.current.currentPrice).toBe(105)
    const trades = [{ id: 'new', price: 105, amount: 2, side: 'buy' as const, timestamp: 2001 }]
    state = { ...state, snapshot: { ...state.snapshot!, recentTrades: trades } }
    act(() => emit(state))
    expect(result.current.recentTrades).toBe(trades)
    state = { ...state, connection: { ...state.connection, lastUpdatedAt: 1001, marketTime: 2001 } }
    act(() => emit(state))
    expect(result.current).toMatchObject({ updatedAt: 1001, marketTime: 2001 })
    const candles = [{ timestamp: 1, open: 100, high: 106, low: 99, close: 105, volume: 50 }]
    state = { ...state, snapshot: { ...state.snapshot!, candles } }
    act(() => emit(state))
    expect(result.current.candles).toBe(candles)
    state = { ...state, connection: { ...state.connection, status: 'reconnecting' } }
    act(() => emit(state))
    expect(result.current.connectionStatus).toBe('reconnecting')
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

  it('clears the old interval and ignores late messages after switching timeframe', () => {
    const callbacks: Array<(state: RealtimeMarketState) => void> = []
    const unsubscribe = vi.fn()
    const subscribe = vi.spyOn(marketDataService, 'subscribe').mockImplementation(options => {
      callbacks.push(options.onState)
      return unsubscribe
    })
    const { result, rerender, unmount } = renderHook(({ frame }: { frame: ChartTimeframe }) => useTechnicalLevelData(instrument, frame), { initialProps: { frame: '1H' as ChartTimeframe } })
    const state: RealtimeMarketState = {
      snapshot: { instrument, timeframe: '1H', candles: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 }, recentTrades: [{ id: 'a', price: 100, amount: 2, side: 'buy', timestamp: 123 }] },
      connection: { requestedMode: 'mock', effectiveMode: 'mock', status: 'mock', provider: 'test', reconnectAttempt: 0, lastUpdatedAt: 123, message: 'Mock' },
    }
    act(() => callbacks[0](state))
    expect(result.current).toMatchObject({ currentPrice: 100, updatedAt: 123, recentTrades: state.snapshot!.recentTrades })
    rerender({ frame: '4H' })
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(subscribe).toHaveBeenLastCalledWith(expect.objectContaining({ timeframe: '4H' }))
    expect(result.current).toMatchObject({ isLoading: true, currentPrice: null, recentTrades: [] })
    act(() => callbacks[1](state))
    act(() => callbacks[0]({ ...state, snapshot: { ...state.snapshot!, instrument: { ...instrument, lastPrice: 999 } } }))
    expect(result.current.currentPrice).toBe(100)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
  })
})
