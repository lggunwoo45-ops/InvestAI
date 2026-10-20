import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarketExplorer } from './MarketExplorer'

vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('@/hooks/useWatchlists', () => ({ useWatchlists: () => ({ watchlistItems: [], activeReview: null, getWatchlistItem: () => undefined, removeFromWatchlist: vi.fn() }) }))
const previous = { venue: 'upbit-krw' as const, source: 'live' as const, fetchedAt: 1792454400000, instruments: [{ id: 'upbit-btc', marketId: 'upbit' as const, symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }] }
function props(): ComponentProps<typeof MarketExplorer> {
  return { venue: 'upbit-krw', mode: 'live', catalog: null, cachedCatalog: previous, loading: false, error: 'Upbit rate-limit (429)', selectedInstrumentId: null, search: '', onSearchChange: vi.fn(), favoritesOnly: false, onFavoritesOnlyChange: vi.fn(), sortField: 'alphabet', onSortFieldChange: vi.fn(), sortDirection: 'asc', spotQuoteFilter: 'USDT', onSpotQuoteFilterChange: vi.fn(), onSortDirectionChange: vi.fn(), favoriteIds: new Set(), onVenueChange: vi.fn(), onModeChange: vi.fn(), onSelect: vi.fn(), onToggleFavorite: vi.fn(), onRetry: vi.fn() }
}
describe('Market catalog recovery display', () => {
  it('keeps previous rows usable during failure with an explicit stale-price notice', () => {
    const options = props()
    render(<MarketExplorer {...options} />)
    expect(screen.getByText('이전 조회 목록')).toBeTruthy()
    expect(screen.getByText(/가격은 현재 시세가 아닙니다/)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('업비트 요청 제한')
    expect(screen.queryByText('공개 API')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '열기 BTC/KRW' }))
    expect(options.onSelect).toHaveBeenCalledWith(previous.instruments[0])
    fireEvent.click(screen.getByRole('button', { name: '재시도' }))
    expect(options.onRetry).toHaveBeenCalledOnce()
  })
  it('keeps rows while retrying and replaces the stale label after success', () => {
    const options = props()
    const { rerender } = render(<MarketExplorer {...options} loading error={null} />)
    expect(screen.getByRole('button', { name: '열기 BTC/KRW' })).toBeTruthy()
    expect(screen.getByText(/자동으로 다시 시도합니다/)).toBeTruthy()
    rerender(<MarketExplorer {...options} catalog={previous} cachedCatalog={null} error={null} />)
    expect(screen.queryByText('이전 조회 목록')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('does not invent a catalog when the first request fails', () => {
    render(<MarketExplorer {...props()} cachedCatalog={null} />)
    expect(screen.queryByRole('button', { name: '열기 BTC/KRW' })).toBeNull()
    expect(screen.queryByText('이전 조회 목록')).toBeNull()
    expect(screen.getByRole('alert')).toBeTruthy()
  })
})
