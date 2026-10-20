import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { marketDataService, type MarketStreamOptions } from '@/services/market/marketDataService'
import type { MarketInstrument } from '@/types/market'
import type { MarketDetailSnapshot, RealtimeMarketState } from '@/types/marketDetail'
import { useMarketDetailData } from './useMarketDetailData'

const workspace = vi.hoisted(() => ({ marketDataMode: 'live', setActiveMarketState: vi.fn() }))
vi.mock('./useMarketWorkspace', () => ({ useMarketWorkspace: () => workspace }))
const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'BTC', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }
const snapshot: MarketDetailSnapshot = { instrument, timeframe: '1H', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } }
const state: RealtimeMarketState = { snapshot, connection: { requestedMode: 'live', effectiveMode: 'live', status: 'connecting', provider: 'test', reconnectAttempt: 0, lastUpdatedAt: 1, message: 'history' } }
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

it('shows preview separately, never publishes it as live input, and does not restart for price-only changes', () => {
  const listeners: MarketStreamOptions[] = []
  const stop = vi.fn()
  const subscribe = vi.spyOn(marketDataService, 'subscribe').mockImplementation(options => { listeners.push(options); return stop })
  vi.spyOn(marketDataService, 'getChartPreview').mockReturnValue({ snapshot, storedAt: 1 })
  const { result, rerender, unmount } = renderHook(({ item }) => useMarketDetailData(item, '1H'), { initialProps: { item: instrument } })
  expect(result.current.state).toBeNull()
  expect(result.current.preview?.snapshot).toBe(snapshot)
  expect(workspace.setActiveMarketState).not.toHaveBeenCalled()
  expect(listeners[0].priority).toBe(20)
  rerender({ item: { ...instrument, lastPrice: 101 } })
  expect(subscribe).toHaveBeenCalledOnce()
  act(() => listeners[0].onState(state))
  expect(result.current.preview).toBeNull()
  expect(workspace.setActiveMarketState).toHaveBeenCalledWith(state)
  rerender({ item: { ...instrument, id: 'upbit-eth', symbol: 'ETH/KRW' } })
  act(() => listeners[0].onState(state))
  expect(result.current.state).toBeNull()
  expect(stop).toHaveBeenCalledOnce()
  unmount()
})
