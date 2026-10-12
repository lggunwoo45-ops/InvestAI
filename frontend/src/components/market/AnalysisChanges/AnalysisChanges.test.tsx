import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WatchlistReviewActions } from '@/components/ai-copilot/WatchlistReviewActions'
import { buildAiCopilotFinalReadEvidence, type AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import { itemFromInstrument, loadWatchlist, reviewItem, saveWatchlist, type ReviewSnapshot } from '@/services/watchlist/watchlistStorage'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketInstrument } from '@/types/market'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { defaultWatchlists, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { AnalysisChanges } from './AnalysisChanges'

const first: MarketInstrument = { id: 'upbit-test', symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }
const second: MarketInstrument = { ...first, id: 'upbit-second', symbol: 'SECOND/KRW', name: 'Second' }
const at = '2026-10-10T00:00:00Z'
const result: AiCopilotFinalRead = { state: 'keepWatching', title: 'Keep watching', summary: 'Observe', why: 'Mixed', nextCheck: 'Check evidence', caution: 'Review only', confidenceLabel: 'Low', sourceFactors: [], evidenceSummary: [], evidenceItems: [] }
function state(instrument: MarketInstrument): RealtimeMarketState {
  return { snapshot: { instrument, timeframe: '1H', candles: [], recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } }, connection: { requestedMode: 'live', effectiveMode: 'live', status: 'live', provider: 'upbit', reconnectAttempt: 0, lastUpdatedAt: Date.now(), message: '' } }
}
function baseline(instrument: MarketInstrument): ReviewSnapshot {
  return {
    finalReadState: result.state, finalReadTitle: result.title, finalReadSummary: result.summary, capturedAt: at, currentPrice: 90,
    analysisEvidence: { instrumentId: instrument.id, market: 'upbit', exchange: 'upbit-krw', quoteCurrency: 'KRW', timeframe: '1H', source: 'live', stale: false, observedAt: at, technicalTrend: 'downward', momentumState: 'negative', volumeState: 'normal', dataQuality: 'live' },
  }
}
function actions(instrument: MarketInstrument, marketState = state(instrument)) {
  return <WatchlistReviewActions instrument={instrument} finalRead={result} language="en" timeframe="1H" marketState={marketState} evidence={buildAiCopilotFinalReadEvidence({ instrument, dataQuality: 'live' })} />
}
function open() {
  fireEvent.click(screen.getByText('Analysis changes'))
  return screen.getByRole('region', { name: 'Analysis changes' })
}
function row(region: HTMLElement, name: string) {
  const element = within(region).getByText(name, { selector: 'strong' }).closest('li')
  if (!element) throw new Error(`Missing evidence row ${name}`)
  return within(element)
}

describe('Analysis changes', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, watchlists: defaultWatchlists.map(list => ({ ...list, instrumentIds: [] })) }))
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network allowed'))
  })
  afterEach(() => vi.restoreAllMocks())

  it('starts collapsed and exposes explicit states, timestamps and neutral indicators', () => {
    renderWithProviders(<AnalysisChanges previous={baseline(first)} current={{ ...baseline(first), currentPrice: 110 }} language="en" />)
    const details = screen.getByText('Analysis changes').closest('details')
    expect(details?.open).toBe(false)
    expect(screen.getByRole('button', { name: 'Analysis changes', expanded: false })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Analysis changes' })).toBeNull()
    const region = open()
    const toggle = screen.getByRole('button', { name: 'Analysis changes', expanded: true })
    expect(details?.open).toBe(true)
    expect(toggle.getAttribute('aria-controls')).toBe(region.id)
    expect(within(region).getByText('Previous state')).toBeTruthy()
    expect(within(region).getByText('Current state')).toBeTruthy()
    expect(within(region).getByText('Comparison time')).toBeTruthy()
    expect(region.querySelector('time')?.dateTime).toBe(at)
    expect(row(region, 'Price').getByText('Unavailable')).toBeTruthy()
    expect(row(region, 'Price').getByText('90 → 110')).toBeTruthy()
    fireEvent.click(toggle)
    expect(details?.open).toBe(false)
    expect(screen.getByRole('button', { name: 'Analysis changes', expanded: false })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Analysis changes' })).toBeNull()
    expect(details?.querySelector('section')).toBeNull()
    expect(row(open(), 'Price').getByText('90 → 110')).toBeTruthy()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
  it('shows the Korean missing-evidence message for readable legacy history', () => {
    renderWithProviders(<AnalysisChanges previous={{ ...baseline(first), analysisEvidence: undefined }} current={baseline(first)} language="ko" />)
    fireEvent.click(screen.getByText('분석 변화'))
    const region = screen.getByRole('region', { name: '분석 변화' })
    expect(within(region).getByText('비교할 근거가 부족합니다')).toBeTruthy()
    expect(within(region).queryByText('근거 개선')).toBeNull()
  })
  it('updates the confirmed baseline through the existing provider and persists evidence', () => {
    saveWatchlist(reviewItem([itemFromInstrument(first)], first.id, baseline(first)))
    renderWithProviders(actions(first))
    const region = open()
    expect(row(region, 'Technical trend').getByText('Evidence improved')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    expect(row(region, 'Technical trend').getByText('Unchanged')).toBeTruthy()
    expect(loadWatchlist()[0]?.lastReviewedSnapshot?.analysisEvidence?.technicalTrend).toBe('neutral')
    expect(loadWatchlist()[0]?.reviewHistory?.[0]?.analysisEvidence?.technicalTrend).toBe('neutral')
    expect(loadWatchlist()[0]?.reviewHistory?.[1]?.analysisEvidence?.technicalTrend).toBe('downward')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
  it('immediately switches to the selected instrument baseline and collapses details', () => {
    const secondBaseline = baseline(second)
    if (!secondBaseline.analysisEvidence) throw new Error('Fixture evidence required')
    saveWatchlist([...reviewItem([itemFromInstrument(first)], first.id, baseline(first)), ...reviewItem([itemFromInstrument(second)], second.id, { ...secondBaseline, finalReadTitle: 'Second baseline', analysisEvidence: { ...secondBaseline.analysisEvidence, technicalTrend: 'upward' } })])
    const view = renderWithProviders(actions(first))
    expect(row(open(), 'Technical trend').getByText('Evidence improved')).toBeTruthy()
    view.rerender(actions(second))
    expect(screen.getByText('Analysis changes').closest('details')?.open).toBe(false)
    const region = open()
    expect(within(region).getByText('Second baseline', { selector: 'dd' })).toBeTruthy()
    expect(row(region, 'Final Read').getByText('Second baseline → Keep watching')).toBeTruthy()
    expect(row(region, 'Technical trend').getByText('Evidence weakened')).toBeTruthy()
  })
  it('limits disconnected evidence and does not reuse another timeframe', () => {
    saveWatchlist(reviewItem([itemFromInstrument(first)], first.id, baseline(first)))
    const disconnected = state(first)
    disconnected.connection.status = 'disconnected'
    const view = renderWithProviders(actions(first, disconnected))
    const region = open()
    expect(within(region).getByText('Stale, mock or limited data restricts directional comparison.')).toBeTruthy()
    expect(row(region, 'Technical trend').getByText('Unavailable')).toBeTruthy()
    const otherTimeframe = state(first)
    if (otherTimeframe.snapshot) otherTimeframe.snapshot.timeframe = '4H'
    view.rerender(actions(first, otherTimeframe))
    expect(within(region).getByText('Insufficient evidence to compare')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    expect(loadWatchlist()[0]?.lastReviewedSnapshot?.analysisEvidence).toBeUndefined()
  })
})
