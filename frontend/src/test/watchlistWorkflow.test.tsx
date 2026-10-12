import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { WatchlistReviewActions } from '@/components/ai-copilot/WatchlistReviewActions'
import { MarketExplorer } from '@/components/market/MarketExplorer/MarketExplorer'
import { useWatchlists } from '@/hooks/useWatchlists'
import { itemFromInstrument, loadWatchlist } from '@/services/watchlist/watchlistStorage'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import type { MarketInstrument } from '@/types/market'
import { renderWithProviders } from './renderWithProviders'

const instrument: MarketInstrument = { id: 'upbit-test', symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }
const finalRead: AiCopilotFinalRead = { state: 'wait', title: 'Wait for now', summary: 'Observe available evidence', why: 'Mixed evidence', nextCheck: 'Check later', caution: 'Review only', confidenceLabel: 'Low', sourceFactors: [], evidenceSummary: [], evidenceItems: [] }

function Workflow() {
  const { favoriteIds, toggleWatchlist } = useWatchlists()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selected, setSelected] = useState<MarketInstrument | null>(null)
  return <>
    <MarketExplorer venue="upbit-krw" mode="mock" catalog={{ venue: 'upbit-krw', source: 'mock', fetchedAt: 1, instruments: [instrument] }} loading={false} error={null} selectedInstrumentId={selected?.id ?? null} search="" onSearchChange={() => {}} favoritesOnly={favoritesOnly} onFavoritesOnlyChange={setFavoritesOnly} sortField="alphabet" onSortFieldChange={() => {}} sortDirection="asc" onSortDirectionChange={() => {}} spotQuoteFilter="USDT" onSpotQuoteFilterChange={() => {}} favoriteIds={favoriteIds} onVenueChange={() => {}} onModeChange={() => {}} onSelect={setSelected} onToggleFavorite={() => toggleWatchlist(itemFromInstrument(instrument))} onRetry={() => {}} />
    {selected && <WatchlistReviewActions instrument={selected} finalRead={finalRead} language="en" />}
  </>
}

describe('watchlist daily workflow', () => {
  beforeEach(() => localStorage.clear())
  it('toggles stars, updates scopes, selects, confirms and persists through remount', async () => {
    const view = renderWithProviders(<Workflow />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist TEST/KRW' }))
    expect(screen.getByRole('button', { name: 'Watchlist 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review queue 1' }))
    expect(screen.getByText(/First review needed/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open TEST/KRW' }))
    const actions = screen.getByRole('group', { name: 'List scope' })
    expect(within(actions).getByRole('button', { name: 'Review queue 1' })).toBeTruthy()
    expect(screen.getByText('In watchlist')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
    await waitFor(() => expect(loadWatchlist().find(item => item.instrumentId === instrument.id)?.lastReviewedSnapshot?.finalReadState).toBe('wait'))
    expect(screen.getByRole('button', { name: 'Review queue 0' })).toBeTruthy()
    expect(screen.getByText('No instruments need review.')).toBeTruthy()
    view.unmount()
    renderWithProviders(<Workflow />)
    fireEvent.click(screen.getByRole('button', { name: 'Watchlist 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove from watchlist TEST/KRW' }))
    expect(screen.getByText('No watchlist items.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Watchlist 0' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByRole('button', { name: 'Open TEST/KRW' })).toBeTruthy()
  })
  it('stores limited snapshots and never requests a service during confirmation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disabled'))
    function Limited() {
      const { addToWatchlist } = useWatchlists()
      return <><button onClick={() => addToWatchlist(itemFromInstrument(instrument))}>Save fixture</button><WatchlistReviewActions instrument={instrument} finalRead={null} language="ko" /></>
    }
    renderWithProviders(<Limited />)
    fireEvent.click(screen.getByRole('button', { name: 'Save fixture' }))
    fireEvent.click(screen.getByRole('button', { name: '확인 완료' }))
    expect(loadWatchlist().find(item => item.instrumentId === instrument.id)?.lastReviewedSnapshot?.dataQuality).toBe('limited')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
    fetchSpy.mockRestore()
  })
  it('exposes shared provider operations and preserves membership on review', () => {
    function Operations() {
      const { addToWatchlist, removeFromWatchlist, getWatchlistItem, isWatchlisted, markReviewed } = useWatchlists()
      return <>
        <button onClick={() => addToWatchlist(itemFromInstrument(instrument))}>Add fixture</button>
        <button onClick={() => removeFromWatchlist(instrument.id)}>Remove fixture</button>
        <button onClick={() => markReviewed(instrument.id, { finalReadState: 'wait', finalReadTitle: 'Wait', finalReadSummary: 'Observe', capturedAt: '2026-10-10T00:00:00Z' })}>Review fixture</button>
        <span>{isWatchlisted(instrument.id) ? 'Saved fixture' : 'Missing fixture'}</span>
        <span>{getWatchlistItem(instrument.id)?.lastReviewedAt ?? 'Never reviewed'}</span>
      </>
    }
    const view = renderWithProviders(<Operations />)
    fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add fixture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review fixture' }))
    expect(screen.getByText('Saved fixture')).toBeTruthy()
    expect(screen.getByText('2026-10-10T00:00:00Z')).toBeTruthy()
    view.rerender(<Operations />)
    expect(screen.getByText('Saved fixture')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove fixture' }))
    expect(screen.getByText('Missing fixture')).toBeTruthy()
  })
})
