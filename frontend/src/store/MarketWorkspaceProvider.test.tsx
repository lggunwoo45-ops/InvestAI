import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { expect, it } from 'vitest'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useActiveMarketState } from '@/hooks/useActiveMarketState'
import type { MarketInstrument } from '@/types/market'
import type { RealtimeMarketState } from '@/types/marketDetail'
import type { MarketWorkspaceValue } from './marketWorkspaceContext'
import { MarketWorkspaceProvider } from './MarketWorkspaceProvider'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'BTC', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }

it('keeps selection consumers unchanged through 100 ticks while live consumers receive every update', () => {
  let controls!: MarketWorkspaceValue
  let selectionRenders = 0, liveRenders = 0
  function Selection() {
    const workspace = useMarketWorkspace()
    useEffect(() => { controls = workspace }, [workspace])
    selectionRenders++
    return <div data-testid="selection">{workspace.selectedInstrument?.symbol ?? 'none'} {workspace.selectedTimeframe} {workspace.marketDataMode}</div>
  }
  function Quote() {
    const state = useActiveMarketState()
    liveRenders++
    return <div data-testid="quote">{state?.snapshot?.instrument.lastPrice ?? 'none'} {state?.connection.status}</div>
  }
  render(<MarketWorkspaceProvider><Selection /><Quote /></MarketWorkspaceProvider>)
  act(() => controls.selectInstrument(instrument))
  const initialSelectionRenders = selectionRenders, initialLiveRenders = liveRenders
  let state: RealtimeMarketState = {
    snapshot: { instrument, timeframe: '1H', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } },
    connection: { requestedMode: 'live', effectiveMode: 'live', status: 'live', provider: 'test', reconnectAttempt: 0, lastUpdatedAt: 1, message: 'Live' },
  }
  for (let i = 1; i <= 100; i++) {
    state = { ...state, snapshot: { ...state.snapshot!, instrument: { ...instrument, lastPrice: 100 + i } } }
    act(() => controls.setActiveMarketState(state))
  }
  expect(selectionRenders - initialSelectionRenders).toBe(0)
  expect(liveRenders - initialLiveRenders).toBe(100)
  expect(screen.getByTestId('quote').textContent).toBe('200 live')
  act(() => controls.setActiveMarketState({ ...state, connection: { ...state.connection, status: 'reconnecting' } }))
  expect(screen.getByTestId('quote').textContent).toBe('200 reconnecting')
  act(() => { controls.selectTimeframe('4H'); controls.setMarketDataMode('mock') })
  expect(screen.getByTestId('selection').textContent).toBe('BTC/KRW 4H mock')
  act(() => controls.clearInstrument())
  expect(screen.getByTestId('selection').textContent).toBe('none 4H mock')
  expect(screen.getByTestId('quote').textContent?.trim()).toBe('none')
})
