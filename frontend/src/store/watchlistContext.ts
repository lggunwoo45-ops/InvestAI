import { createContext } from 'react'

import type { Watchlist } from '@/types/dashboard'

export interface WatchlistValue {
  watchlists: readonly Watchlist[]
  activeWatchlistId: string
  favoriteIds: ReadonlySet<string>
  recentlyViewedIds: readonly string[]
  setActiveWatchlistId: (id: string) => void
  createWatchlist: (name: string) => void
  deleteWatchlist: (id: string) => void
  toggleFavorite: (instrumentId: string) => void
  toggleInWatchlist: (watchlistId: string, instrumentId: string) => void
  removeFromWatchlist: (watchlistId: string, instrumentId: string) => void
  reorderWatchlist: (watchlistId: string, sourceIndex: number, targetIndex: number) => void
  trackRecentlyViewed: (instrumentId: string) => void
}

export const WatchlistContext = createContext<WatchlistValue | null>(null)
