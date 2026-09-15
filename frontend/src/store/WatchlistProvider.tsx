import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { WatchlistContext, type WatchlistValue } from '@/store/watchlistContext'
import type { Watchlist } from '@/types/dashboard'
import {
  MAX_CUSTOM_WATCHLISTS,
  reorderIds,
  WATCHLIST_SCHEMA_VERSION,
} from '@/utils/watchlists'
import {
  loadStoredRecentlyViewed,
  loadStoredWatchlists,
  RECENTLY_VIEWED_STORAGE_KEY,
  WATCHLIST_STORAGE_KEY,
} from '@/utils/watchlistStorage'

function targetListId(instrumentId: string) {
  if (instrumentId.startsWith('krx-')) return 'korea'
  if (instrumentId.startsWith('us-')) return 'us'
  return 'crypto'
}

export function WatchlistProvider({ children }: PropsWithChildren) {
  const [watchlists, setWatchlists] = useState<readonly Watchlist[]>(() => loadStoredWatchlists())
  const [activeWatchlistId, setActiveWatchlistId] = useState('crypto')
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<readonly string[]>(() => loadStoredRecentlyViewed())

  useEffect(() => {
    try { window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, watchlists })) } catch { /* Keep in-memory state usable. */ }
  }, [watchlists])
  useEffect(() => {
    try { window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, recentlyViewedIds })) } catch { /* Keep in-memory state usable. */ }
  }, [recentlyViewedIds])

  const updateItems = useCallback((watchlistId: string, update: (ids: readonly string[]) => readonly string[]) => {
    setWatchlists((current) => current.map((list) => list.id === watchlistId ? { ...list, instrumentIds: update(list.instrumentIds) } : list))
  }, [])

  const toggleInWatchlist = useCallback((watchlistId: string, instrumentId: string) => {
    updateItems(watchlistId, (ids) => ids.includes(instrumentId) ? ids.filter((id) => id !== instrumentId) : [...ids, instrumentId])
  }, [updateItems])

  const toggleFavorite = useCallback((instrumentId: string) => {
    setWatchlists((current) => {
      const exists = current.some((list) => list.instrumentIds.includes(instrumentId))
      if (exists) return current.map((list) => ({ ...list, instrumentIds: list.instrumentIds.filter((id) => id !== instrumentId) }))
      const destination = targetListId(instrumentId)
      return current.map((list) => list.id === destination ? { ...list, instrumentIds: [...list.instrumentIds, instrumentId] } : list)
    })
  }, [])

  const createWatchlist = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const isDuplicate = watchlists.some((list) => list.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
    const customCount = watchlists.filter((list) => !list.isDefault).length
    if (isDuplicate || customCount >= MAX_CUSTOM_WATCHLISTS) return
    const id = `list-${globalThis.crypto.randomUUID()}`
    setWatchlists((current) => [...current, { id, name: trimmed, instrumentIds: [], isDefault: false }])
    setActiveWatchlistId(id)
  }, [watchlists])

  const deleteWatchlist = useCallback((id: string) => {
    if (!watchlists.some((list) => list.id === id && !list.isDefault)) return
    setWatchlists((current) => current.filter((list) => list.id !== id))
    setActiveWatchlistId((current) => current === id ? 'crypto' : current)
  }, [watchlists])

  const removeFromWatchlist = useCallback((watchlistId: string, instrumentId: string) => {
    updateItems(watchlistId, (ids) => ids.filter((id) => id !== instrumentId))
  }, [updateItems])

  const reorderWatchlist = useCallback((watchlistId: string, sourceIndex: number, targetIndex: number) => {
    updateItems(watchlistId, (ids) => reorderIds(ids, sourceIndex, targetIndex))
  }, [updateItems])

  const trackRecentlyViewed = useCallback((instrumentId: string) => {
    setRecentlyViewedIds((current) => [instrumentId, ...current.filter((id) => id !== instrumentId)].slice(0, 8))
  }, [])

  const favoriteIds = useMemo(() => new Set(watchlists.flatMap((list) => list.instrumentIds)), [watchlists])
  const value = useMemo<WatchlistValue>(() => ({
    watchlists,
    activeWatchlistId,
    favoriteIds,
    recentlyViewedIds,
    setActiveWatchlistId,
    createWatchlist,
    deleteWatchlist,
    toggleFavorite,
    toggleInWatchlist,
    removeFromWatchlist,
    reorderWatchlist,
    trackRecentlyViewed,
  }), [activeWatchlistId, createWatchlist, deleteWatchlist, favoriteIds, recentlyViewedIds, removeFromWatchlist, reorderWatchlist, toggleFavorite, toggleInWatchlist, trackRecentlyViewed, watchlists])

  return <WatchlistContext value={value}>{children}</WatchlistContext>
}
