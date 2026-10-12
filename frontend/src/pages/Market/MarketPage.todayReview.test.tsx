import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useMemo, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WatchlistReviewActions } from '@/components/ai-copilot/WatchlistReviewActions'
import { itemFromInstrument, loadWatchlist, reviewItem, saveWatchlist } from '@/services/watchlist/watchlistStorage'
import { buildAiCopilotFinalReadEvidence } from '@/services/aiCopilot/aiCopilotFinalRead'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import type { MarketInstrument } from '@/types/market'
import { defaultWatchlists, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { MarketPage } from './MarketPage'

const btc: MarketInstrument = { id: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }
const xrp: MarketInstrument = { ...btc, id: 'upbit-xrp', symbol: 'XRP/KRW', name: 'XRP', lastPrice: 50 }
const finalRead: AiCopilotFinalRead = { state: 'wait', title: 'Wait for now', summary: 'Observe evidence', why: 'Mixed evidence', nextCheck: 'Check later', caution: 'Review only', confidenceLabel: 'Low', sourceFactors: [], evidenceSummary: [], evidenceItems: [] }

function FixtureReviewActions({ instrument }: { instrument: MarketInstrument }) {
  const evidence = useMemo(() => buildAiCopilotFinalReadEvidence({ instrument, dataQuality: 'mock' }), [instrument])
  const marketState = useMemo<RealtimeMarketState>(() => ({
    snapshot: { instrument, timeframe: '1H', candles: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 }, recentTrades: [] },
    connection: { requestedMode: 'mock', effectiveMode: 'mock', status: 'mock', provider: 'fixture', reconnectAttempt: 0, lastUpdatedAt: 1, message: '' },
  }), [instrument])
  return <WatchlistReviewActions instrument={instrument} finalRead={finalRead} language="en" timeframe="1H" evidence={evidence} marketState={marketState} />
}

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: () => ({ catalog: { venue: 'upbit-krw', source: 'mock', fetchedAt: 1, instruments: [btc, xrp] }, loading: false, error: null }) }))
vi.mock('@/hooks/useMarketDetailData', () => ({
  useMarketDetailData: (instrument: MarketInstrument | null, timeframe: string) => ({ state: instrument ? { snapshot: { instrument, timeframe }, connection: { effectiveMode: 'mock' } } : null, error: null }),
}))
// Keep the real selection/provider/actions wiring, replacing only the chart workspace.
vi.mock('@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace', () => ({
  MarketDetailWorkspace: ({ navigator, snapshot }: { navigator: ReactNode; snapshot: { instrument: MarketInstrument } }) => <div>
    {navigator}<div role="img" aria-label={`Chart ${snapshot.instrument.symbol}`} />
    <aside aria-label="Fixture AI Copilot"><strong>{snapshot.instrument.symbol}</strong><FixtureReviewActions instrument={snapshot.instrument} /></aside>
  </div>,
}))

describe('Market Today Review integration', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, watchlists: defaultWatchlists.map(list => ({ ...list, instrumentIds: [] })) }))
    saveWatchlist([itemFromInstrument(xrp)])
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disabled in fixture test'))
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps empty Korean scopes distinct and exposes the active scope', () => {
    saveWatchlist([])
    localStorage.setItem('market-copilot.language', 'ko')
    renderWithProviders(<MarketPage />)
    const scopes = screen.getByRole('group', { name: '목록 범위' })
    expect(within(scopes).getByRole('button', { name: '전체', pressed: true })).toBeTruthy()
    fireEvent.click(within(scopes).getByRole('button', { name: '관심 0' }))
    expect(within(scopes).getByRole('button', { name: '관심 0', pressed: true })).toBeTruthy()
    expect(screen.getByText('관심종목이 없습니다.')).toBeTruthy()
    fireEvent.click(within(scopes).getByRole('button', { name: '다시 볼 종목 0' }))
    expect(within(scopes).getByRole('button', { name: '다시 볼 종목 0', pressed: true })).toBeTruthy()
    expect(screen.getByText('다시 볼 종목이 없습니다.')).toBeTruthy()
    fireEvent.click(within(scopes).getByRole('button', { name: '전체' }))
    expect(within(scopes).getByRole('button', { name: '전체', pressed: true })).toBeTruthy()
    expect(screen.queryByText('다시 볼 종목이 없습니다.')).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('groups notes, changes and history, and persists a note without confirming review', async () => {
    renderWithProviders(<MarketPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open XRP/KRW · Today review' }))
    await screen.findByRole('img', { name: 'Chart XRP/KRW' })
    const record = screen.getByRole('region', { name: 'Review record' })
    expect(within(record).getByRole('textbox', { name: 'Review note' })).toBeTruthy()
    expect(within(record).getByRole('button', { name: 'Analysis changes', expanded: false })).toBeTruthy()
    expect(within(record).getByRole('button', { name: 'Recent review history', expanded: false })).toBeTruthy()
    fireEvent.change(within(record).getByRole('textbox', { name: 'Review note' }), { target: { value: 'Check evidence quality' } })
    fireEvent.click(within(record).getByRole('button', { name: 'Save' }))
    expect(loadWatchlist()[0]?.note).toBe('Check evidence quality')
    expect(loadWatchlist()[0]?.lastReviewedAt).toBeUndefined()
    fireEvent.click(within(record).getByRole('button', { name: 'Mark reviewed' }))
    expect(within(record).getByText('Marked reviewed')).toBeTruthy()
    expect(loadWatchlist()[0]?.reviewHistory?.[0]?.note).toBe('Check evidence quality')
    fireEvent.click(within(record).getByRole('button', { name: 'Recent review history' }))
    expect(within(record).getByRole('region', { name: 'Recent review history' })).toBeTruthy()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('opens a queue instrument with its comparison and confirms the current baseline', async () => {
    const at = '2026-10-10T00:00:00Z'
    saveWatchlist(reviewItem([itemFromInstrument(xrp)], xrp.id, {
      finalReadState: 'keepWatching', finalReadTitle: 'Earlier review', finalReadSummary: 'Earlier evidence', capturedAt: at, currentPrice: 45,
      analysisEvidence: { instrumentId: xrp.id, market: 'upbit', exchange: 'upbit-krw', quoteCurrency: 'KRW', timeframe: '1H', source: 'mock', observedAt: at, stale: true, technicalTrend: 'neutral', momentumState: 'neutral', volumeState: 'normal', dataQuality: 'mock' },
    }))
    renderWithProviders(<MarketPage />)
    const dashboard = screen.getByRole('region', { name: 'Today review' })
    fireEvent.click(within(dashboard).getByRole('button', { name: 'Open XRP/KRW · Today review' }))
    await screen.findByRole('img', { name: 'Chart XRP/KRW' })
    fireEvent.click(screen.getByText('Analysis changes'))
    const changes = screen.getByRole('region', { name: 'Analysis changes' })
    expect(within(changes).getByText('Earlier review', { selector: 'dd' })).toBeTruthy()
    expect(within(changes).getByText('Earlier review → Wait for now')).toBeTruthy()
    expect(within(changes).getByText('45 → 50')).toBeTruthy()
    expect(within(changes).getByText('Stale, mock or limited data restricts directional comparison.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    expect(within(changes).queryByText('Earlier review')).toBeNull()
    expect(within(changes).getByText('50 → 50')).toBeTruthy()
    expect(loadWatchlist()[0]?.lastReviewedSnapshot?.analysisEvidence?.source).toBe('mock')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('switches list scopes, opens highlights, updates confirmation counts and preserves hide/show', async () => {
    renderWithProviders(<MarketPage />)
    const dashboard = screen.getByRole('region', { name: 'Today review' })
    expect(within(dashboard).getByRole('button', { name: 'Watchlist 1 Saved instruments' })).toBeTruthy()
    fireEvent.click(within(dashboard).getByRole('button', { name: 'Watchlist 1 Saved instruments' }))
    const listScope = screen.getByRole('group', { name: 'List scope' })
    expect(within(listScope).getByRole('button', { name: 'Watchlist 1' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(dashboard).getByRole('button', { name: 'Review queue 1 Instruments needing review' }))
    expect(within(listScope).getByRole('button', { name: 'Review queue 1' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(dashboard).getByRole('button', { name: 'Open XRP/KRW · Today review' }))
    expect(await screen.findByRole('img', { name: 'Chart XRP/KRW' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Fixture AI Copilot' }).textContent).toContain('XRP/KRW')
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    await waitFor(() => expect(within(dashboard).getByRole('button', { name: 'Review queue 0 Instruments needing review' })).toBeTruthy())
    expect(within(dashboard).getByRole('button', { name: 'Watchlist 1 Saved instruments' })).toBeTruthy()
    expect(loadWatchlist()[0]?.lastReviewedSnapshot?.finalReadState).toBe('wait')
    expect(within(dashboard).getByText('No instruments need review today.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hide instruments' }))
    expect(screen.getByRole('button', { name: 'Show instruments' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show instruments' }))
    expect(screen.getByRole('group', { name: 'List scope' })).toBeTruthy()
    // The summary occupies the existing header, and highlights do not insert helper paragraphs.
    expect(dashboard.parentElement?.parentElement?.tagName).toBe('MAIN')
    expect(dashboard.querySelector('p')).toBeNull()
    expect(document.body.textContent).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
