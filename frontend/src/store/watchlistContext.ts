import type { ReviewSnapshot, WatchlistItem } from '@/services/watchlist/watchlistStorage'
import { createContext } from 'react'

import type { Watchlist } from '@/types/dashboard'

export interface WatchlistValue {
  watchlistItems: readonly WatchlistItem[]
  isWatchlisted: (id: string) => boolean
  addToWatchlist: (item: WatchlistItem) => void
  toggleWatchlist: (item: WatchlistItem) => void
  markReviewed: (id: string, snapshot: ReviewSnapshot) => void
  saveReviewJournal: (id: string, note: string, reason: string) => void
  getWatchlistItem: (id: string) => WatchlistItem | undefined
  activeReview: { instrumentId: string; snapshot: ReviewSnapshot } | null
  setActiveReview: (value: { instrumentId: string; snapshot: ReviewSnapshot } | null) => void
  watchlists: readonly Watchlist[]
  activeWatchlistId: string
  favoriteIds: ReadonlySet<string>
  recentlyViewedIds: readonly string[]
  setActiveWatchlistId: (id: string) => void
  createWatchlist: (name: string) => void
  deleteWatchlist: (id: string) => void
  toggleFavorite: (instrumentId: string) => void
  toggleInWatchlist: (watchlistId: string, instrumentId: string) => void
  removeFromWatchlist: (watchlistId: string, instrumentId?: string) => void
  reorderWatchlist: (watchlistId: string, sourceIndex: number, targetIndex: number) => void
  trackRecentlyViewed: (instrumentId: string) => void
}

export const WatchlistContext = createContext<WatchlistValue | null>(null)
