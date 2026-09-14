import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { Watchlist } from '@/types/dashboard'
import { WatchlistContext, type WatchlistValue } from '@/store/watchlistContext'
import { defaultWatchlists, reorderIds } from '@/utils/watchlists'

const STORAGE_KEY = 'investai.watchlists.v2'
const RECENT_KEY = 'investai.recently-viewed.v1'

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function targetListId(instrumentId: string) {
  if (instrumentId.startsWith('krx-')) return 'korea'
  if (instrumentId.startsWith('us-')) return 'us'
  return 'crypto'
}

export function WatchlistProvider({ children }: PropsWithChildren) {
  const [watchlists, setWatchlists] = useState<readonly Watchlist[]>(() => readStored(STORAGE_KEY, defaultWatchlists))
  const [activeWatchlistId, setActiveWatchlistId] = useState('crypto')
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<readonly string[]>(() => readStored(RECENT_KEY, []))

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlists)) }, [watchlists])
  useEffect(() => { window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentlyViewedIds)) }, [recentlyViewedIds])

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
    const id = `list-${Date.now().toString(36)}`
    setWatchlists((current) => [...current, { id, name: trimmed, instrumentIds: [], isDefault: false }])
    setActiveWatchlistId(id)
  }, [])

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
    toggleFavorite,
    toggleInWatchlist,
    removeFromWatchlist,
    reorderWatchlist,
    trackRecentlyViewed,
  }), [activeWatchlistId, createWatchlist, favoriteIds, recentlyViewedIds, removeFromWatchlist, reorderWatchlist, toggleFavorite, toggleInWatchlist, trackRecentlyViewed, watchlists])

  return <WatchlistContext value={value}>{children}</WatchlistContext>
}
