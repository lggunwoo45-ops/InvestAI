import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MarketExplorer } from './MarketExplorer'

vi.mock('@/hooks/useCompactLayout', () => ({ useCompactLayout: () => true }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('@/hooks/useWatchlists', () => ({ useWatchlists: () => ({ watchlistItems: [], activeReview: null, getWatchlistItem: () => undefined, removeFromWatchlist: vi.fn() }) }))

it('makes every mobile result reachable and resets pagination when the search changes', async () => {
  const instruments = Array.from({ length: 21 }, (_, index) => ({ id: `coin-${index}`, marketId: 'upbit' as const, symbol: `COIN${String(index).padStart(2, '0')}/KRW`, name: `Coin ${index}`, quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }))
  const props: ComponentProps<typeof MarketExplorer> = {
    venue: 'upbit-krw', mode: 'live', catalog: { venue: 'upbit-krw', source: 'live', fetchedAt: 1792454400000, instruments }, loading: false, error: null, selectedInstrumentId: null, search: '', onSearchChange: vi.fn(), favoritesOnly: false, onFavoritesOnlyChange: vi.fn(), sortField: 'alphabet', onSortFieldChange: vi.fn(), sortDirection: 'asc', spotQuoteFilter: 'USDT', onSpotQuoteFilterChange: vi.fn(), onSortDirectionChange: vi.fn(), favoriteIds: new Set(), onVenueChange: vi.fn(), onModeChange: vi.fn(), onSelect: vi.fn(), onToggleFavorite: vi.fn(), onRetry: vi.fn(),
  }
  const { rerender } = render(<MarketExplorer {...props} />)
  expect(screen.getAllByRole('button', { name: /^열기 COIN/ })).toHaveLength(20)
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(screen.getAllByRole('button', { name: /^열기 COIN/ })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '열기 COIN20/KRW' }))
  expect(props.onSelect).toHaveBeenCalledWith(instruments[20])
  fireEvent.click(screen.getByRole('button', { name: '관심 등록 COIN20/KRW' }))
  expect(props.onToggleFavorite).toHaveBeenCalledWith('coin-20')
  rerender(<MarketExplorer {...props} search="COIN00" />)
  expect(await screen.findByRole('button', { name: '열기 COIN00/KRW' })).toBeTruthy()
  expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true)
})
