import { use } from 'react'

import { WatchlistContext } from '@/store/watchlistContext'

export function useWatchlists() {
  const context = use(WatchlistContext)
  if (!context) throw new Error('useWatchlists must be used inside WatchlistProvider')
  return context
}
