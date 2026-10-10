import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { useWatchlists } from '@/hooks/useWatchlists'
import { renderWithProviders } from './renderWithProviders'

vi.mock('@/services/news/newsService', () => ({ newsService: { loadNews: vi.fn().mockResolvedValue(null) } }))

function WatchlistConsumer() {
  const { favoriteIds } = useWatchlists()
  return <span>Watchlist ready: {favoriteIds.size}</span>
}

describe('provider stability', () => {
  beforeEach(() => localStorage.clear())
  it('renders a simple child with the shared helper', () => {
    renderWithProviders(<span>Test child</span>)
    expect(screen.getByText('Test child')).toBeTruthy()
  })
  it('provides watchlist context through the shared helper, including rerenders', () => {
    const view = renderWithProviders(<WatchlistConsumer />)
    view.rerender(<WatchlistConsumer />)
    expect(screen.getByText(/Watchlist ready:/)).toBeTruthy()
  })
  it('provides watchlist context through the real AppProviders', () => {
    render(<AppProviders><WatchlistConsumer /></AppProviders>)
    expect(screen.getByText(/Watchlist ready:/)).toBeTruthy()
  })
})
