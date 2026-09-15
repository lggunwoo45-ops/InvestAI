import type { Watchlist } from '@/types/dashboard'
import {
  defaultWatchlists,
  isRecentlyViewedStoragePayload,
  isWatchlistStoragePayload,
} from '@/utils/watchlists'

export const WATCHLIST_STORAGE_KEY = 'investai.watchlists.v2'
export const RECENTLY_VIEWED_STORAGE_KEY = 'investai.recently-viewed.v1'

function removeInvalidValue(storage: Storage, key: string) {
  try { storage.removeItem(key) } catch { /* Storage may be unavailable. */ }
}

export function loadStoredWatchlists(storage: Storage = window.localStorage): readonly Watchlist[] {
  try {
    const value = storage.getItem(WATCHLIST_STORAGE_KEY)
    if (!value) return defaultWatchlists
    const parsed: unknown = JSON.parse(value)
    if (isWatchlistStoragePayload(parsed)) return parsed.watchlists
  } catch {
    removeInvalidValue(storage, WATCHLIST_STORAGE_KEY)
    return defaultWatchlists
  }
  removeInvalidValue(storage, WATCHLIST_STORAGE_KEY)
  return defaultWatchlists
}

export function loadStoredRecentlyViewed(storage: Storage = window.localStorage): readonly string[] {
  try {
    const value = storage.getItem(RECENTLY_VIEWED_STORAGE_KEY)
    if (!value) return []
    const parsed: unknown = JSON.parse(value)
    if (isRecentlyViewedStoragePayload(parsed)) return parsed.recentlyViewedIds
  } catch {
    removeInvalidValue(storage, RECENTLY_VIEWED_STORAGE_KEY)
    return []
  }
  removeInvalidValue(storage, RECENTLY_VIEWED_STORAGE_KEY)
  return []
}
