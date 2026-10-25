import * as localAi from '@/services/ai/localAiClient'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { loadWatchlist } from '@/services/watchlist/watchlistStorage'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Candle, RealtimeMarketState } from '@/types/marketDetail'
import { AiCopilot } from './AiCopilot'

const mocks = vi.hoisted(() => ({ workspace: vi.fn() }))

vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => mocks.workspace() }))
vi.mock('@/hooks/useActiveMarketState', () => ({ useActiveMarketState: () => mocks.workspace().activeMarketState }))
vi.mock('@/hooks/useUiStore', () => ({ useUiStore: () => ({ toggleAiCopilot: vi.fn() }) }))
vi.mock('@/hooks/useNewsProviderMode', () => ({ useNewsProviderMode: () => ({ mode: 'mock', result: null }) }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@/components/ai/AiAnalysisFoundation/AiAnalysisFoundation', () => ({ AiAnalysisFoundation: () => <div>Analysis foundation</div> }))
vi.mock('@/components/news/InstrumentRelatedNews/InstrumentRelatedNews', () => ({ InstrumentRelatedNews: () => <div>Related news</div> }))

const instrument = (id: string, change24hPercent: number): MarketInstrument => ({
  id, marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: `${id}/KRW`, displaySymbol: `${id}/KRW`, name: id,
  quoteCurrency: 'KRW', lastPrice: 100, change24hPercent, volume24h: 100_000,
})

function candles(direction: 'up' | 'down'): Candle[] {
  return Array.from({ length: 60 }, (_, index) => {
    const close = direction === 'up' ? 97 + index * 0.05 : 103 - index * 0.05
    return { timestamp: 1_700_000_000_000 + index * 60_000, open: close - 0.1, high: close + 0.8, low: close - 0.8, close, volume: 100 + index }
  })
}

function marketState(selected: MarketInstrument, series: Candle[]): RealtimeMarketState {
  return {
    snapshot: { instrument: selected, timeframe: '1H', candles: series, orderbook: { symbolId: selected.id, asks: [], bids: [], spread: 0 }, recentTrades: [] },
    connection: { requestedMode: 'live', effectiveMode: 'live', status: 'live', provider: 'fixture', reconnectAttempt: 0, lastUpdatedAt: 1, message: 'Fixture' },
  }
}

function workspace(selected: MarketInstrument, series: Candle[]) {
  return {
    selectedInstrument: selected, selectedTimeframe: '1H', marketDataMode: 'live', activeMarketState: marketState(selected, series),
    selectInstrument: vi.fn(), clearInstrument: vi.fn(), selectTimeframe: vi.fn(), setMarketDataMode: vi.fn(), setActiveMarketState: vi.fn(),
  }
}

describe('AiCopilot selected-instrument evidence wiring', () => {
  it('updates the final read and scenario context when the selected instrument changes', () => {
    const constructive = instrument('AAA', 3.2)
    const weak = instrument('BBB', -4.2)
    mocks.workspace.mockReturnValue(workspace(constructive, candles('up')))
    const view = renderWithProviders(<AiCopilot />)

    const first = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(first.getAttribute('data-final-read')).toBe('approachReviewPossible')
    fireEvent.click(within(first).getByRole('button', { name: 'Show evidence details' }))
    expect(first.textContent).toContain('Instrument: AAA/KRW')
    expect(screen.getByRole('link', { name: 'Open live trends and price criteria →' }).getAttribute('href')).toBe('/my-analysis?instrumentId=AAA')
    expect(screen.queryByText(/Constructive continuation remains possible/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist AAA/KRW · AI Copilot' }))
    expect(screen.getByText('In watchlist')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    expect(loadWatchlist().find(item => item.instrumentId === 'AAA')?.lastReviewedSnapshot?.finalReadState).toBe('approachReviewPossible')
    expect(first.getAttribute('data-final-read')).toBe('approachReviewPossible')

    mocks.workspace.mockReturnValue(workspace(weak, candles('down')))
    view.rerender(<AiCopilot />)

    const second = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(second.getAttribute('data-final-read')).not.toBe('approachReviewPossible')
    expect(second.textContent).toContain('Instrument: BBB/KRW')
    expect(second.textContent).not.toContain('Instrument: AAA/KRW')
  })
})

it('clears prepared AI evidence and paid consent when the selected instrument changes', async () => {
  const gateway = vi.spyOn(localAi, 'localAiCall').mockResolvedValue({ reservedUsd: .01, inputTokenCeiling: 100, outputTokenCeiling: 512 })
  mocks.workspace.mockReturnValue(workspace(instrument('FIRST', 1), candles('up')))
  const view = renderWithProviders(<AiCopilot />)
  fireEvent.click(screen.getByRole('button', { name: 'Prepare evidence and cost limit' }))
  fireEvent.click(await screen.findByRole('checkbox', { name: /I consent to sending/ }))
  expect((screen.getByRole('button', { name: 'Request one AI explanation' }) as HTMLButtonElement).disabled).toBe(false)
  mocks.workspace.mockReturnValue(workspace(instrument('SECOND', 1), candles('up')))
  view.rerender(<AiCopilot />)
  expect(screen.queryByRole('button', { name: 'Request one AI explanation' })).toBeNull()
  expect(screen.queryByText('Review frozen evidence')).toBeNull()
  expect(gateway).toHaveBeenCalledTimes(1)
  expect(gateway.mock.calls[0][0]).toBe('estimate')
  gateway.mockRestore()
})
