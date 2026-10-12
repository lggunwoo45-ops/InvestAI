import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WatchlistReviewActions } from '@/components/ai-copilot/WatchlistReviewActions'
import { itemFromInstrument, loadWatchlist, saveWatchlist } from '@/services/watchlist/watchlistStorage'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import type { MarketInstrument } from '@/types/market'
import { defaultWatchlists, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { MarketPage } from './MarketPage'

const btc: MarketInstrument = { id: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }
const xrp: MarketInstrument = { ...btc, id: 'upbit-xrp', symbol: 'XRP/KRW', name: 'XRP', lastPrice: 50 }
const finalRead: AiCopilotFinalRead = { state: 'wait', title: 'Wait for now', summary: 'Observe evidence', why: 'Mixed evidence', nextCheck: 'Check later', caution: 'Review only', confidenceLabel: 'Low', sourceFactors: [], evidenceSummary: [], evidenceItems: [] }

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: () => ({ catalog: { venue: 'upbit-krw', source: 'mock', fetchedAt: 1, instruments: [btc, xrp] }, loading: false, error: null }) }))
vi.mock('@/hooks/useMarketDetailData', () => ({
  useMarketDetailData: (instrument: MarketInstrument | null, timeframe: string) => ({ state: instrument ? { snapshot: { instrument, timeframe }, connection: { effectiveMode: 'mock' } } : null, error: null }),
}))
// Keep the real selection/provider/actions wiring, replacing only the chart workspace.
vi.mock('@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace', () => ({
  MarketDetailWorkspace: ({ navigator, snapshot }: { navigator: ReactNode; snapshot: { instrument: MarketInstrument } }) => <div>
    {navigator}<div role="img" aria-label={`Chart ${snapshot.instrument.symbol}`} />
    <aside aria-label="Fixture AI Copilot"><strong>{snapshot.instrument.symbol}</strong><WatchlistReviewActions instrument={snapshot.instrument} finalRead={finalRead} language="en" /></aside>
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
