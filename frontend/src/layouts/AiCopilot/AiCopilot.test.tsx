import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import type { Candle, RealtimeMarketState } from '@/types/marketDetail'
import { AiCopilot } from './AiCopilot'

const mocks = vi.hoisted(() => ({ workspace: vi.fn() }))

vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => mocks.workspace() }))
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
    const view = render(<AiCopilot />)

    const first = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(first.getAttribute('data-final-read')).toBe('approachReviewPossible')
    expect(first.textContent).toContain('Instrument: AAA/KRW')
    expect(within(screen.getByRole('complementary', { name: 'AI Copilot' })).getByText(/Constructive continuation remains possible/)).toBeTruthy()

    mocks.workspace.mockReturnValue(workspace(weak, candles('down')))
    view.rerender(<AiCopilot />)

    const second = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(second.getAttribute('data-final-read')).not.toBe('approachReviewPossible')
    expect(second.textContent).toContain('Instrument: BBB/KRW')
    expect(second.textContent).not.toContain('Instrument: AAA/KRW')
  })
})
