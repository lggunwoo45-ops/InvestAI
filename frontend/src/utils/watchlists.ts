import type { Watchlist } from '@/types/dashboard'

export const WATCHLIST_SCHEMA_VERSION = 1
export const MAX_CUSTOM_WATCHLISTS = 8

export interface WatchlistStoragePayload {
  schemaVersion: typeof WATCHLIST_SCHEMA_VERSION
  watchlists: readonly Watchlist[]
}

export interface RecentlyViewedStoragePayload {
  schemaVersion: typeof WATCHLIST_SCHEMA_VERSION
  recentlyViewedIds: readonly string[]
}

export const defaultWatchlists: readonly Watchlist[] = [
  { id: 'crypto', name: 'Crypto', instrumentIds: ['upbit-btc', 'upbit-eth', 'binance-sol'], isDefault: true },
  { id: 'korea', name: 'Korea', instrumentIds: ['krx-005930', 'krx-000660'], isDefault: true },
  { id: 'us', name: 'US', instrumentIds: ['us-nvda', 'us-aapl'], isDefault: true },
  { id: 'custom', name: 'Custom', instrumentIds: [], isDefault: true },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isWatchlist(value: unknown): value is Watchlist {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && isStringArray(value.instrumentIds)
    && typeof value.isDefault === 'boolean'
}

export function isWatchlistStoragePayload(value: unknown): value is WatchlistStoragePayload {
  if (!isRecord(value) || value.schemaVersion !== WATCHLIST_SCHEMA_VERSION || !Array.isArray(value.watchlists)) return false
  return value.watchlists.length > 0 && value.watchlists.every(isWatchlist)
}

export function isRecentlyViewedStoragePayload(value: unknown): value is RecentlyViewedStoragePayload {
  return isRecord(value)
    && value.schemaVersion === WATCHLIST_SCHEMA_VERSION
    && isStringArray(value.recentlyViewedIds)
}

export function reorderIds(ids: readonly string[], sourceIndex: number, targetIndex: number): readonly string[] {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= ids.length || targetIndex >= ids.length) return ids
  const next = [...ids]
  const [moved] = next.splice(sourceIndex, 1)
  if (moved) next.splice(targetIndex, 0, moved)
  return next
}
