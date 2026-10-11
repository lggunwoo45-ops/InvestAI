import { loadWatchlist, saveWatchlist, itemFromInstrument, reviewItem, sanitizeItems, type ReviewSnapshot, type WatchlistItem } from '@/services/watchlist/watchlistStorage'
import { marketDataService } from '@/services/market/marketDataService'
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
  const [mountedAt] = useState(() => new Date().toISOString())
  const [metadata, setMetadata] = useState<readonly WatchlistItem[]>(loadWatchlist)
  const [activeReview, setActiveReview] = useState<{ instrumentId: string; snapshot: ReviewSnapshot } | null>(null)
  const [watchlists, setWatchlists] = useState<readonly Watchlist[]>(() => {
    const lists = loadStoredWatchlists()
    // Restore review-key membership without adding a second favorite system.
    return lists.map(list => ({ ...list, instrumentIds: [...new Set([...list.instrumentIds, ...metadata.filter(item => targetListId(item.instrumentId) === list.id).map(item => item.instrumentId)])] }))
  })
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
    setMetadata(current => current.filter(item => item.instrumentId !== instrumentId))
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

  const removeFromWatchlist = useCallback((watchlistId: string, instrumentId?: string) => {
    if (instrumentId === undefined) {
      setWatchlists(current => current.map(list => ({ ...list, instrumentIds: list.instrumentIds.filter(id => id !== watchlistId) })))
      setMetadata(current => current.filter(item => item.instrumentId !== watchlistId))
    } else updateItems(watchlistId, (ids) => ids.filter((id) => id !== instrumentId))
  }, [updateItems])

  const reorderWatchlist = useCallback((watchlistId: string, sourceIndex: number, targetIndex: number) => {
    updateItems(watchlistId, (ids) => reorderIds(ids, sourceIndex, targetIndex))
  }, [updateItems])

  const trackRecentlyViewed = useCallback((instrumentId: string) => {
    setRecentlyViewedIds((current) => [instrumentId, ...current.filter((id) => id !== instrumentId)].slice(0, 8))
  }, [])

  const favoriteIds = useMemo(() => new Set(watchlists.flatMap((list) => list.instrumentIds)), [watchlists])
  const watchlistItems = useMemo(() => {
    const known = marketDataService.getKnownInstruments([...favoriteIds])
    return [...favoriteIds].map(id => {
      const saved = metadata.find(item => item.instrumentId === id)
      if (saved) return saved
      const instrument = known.get(id)
      if (instrument) return itemFromInstrument(instrument, mountedAt)
      const at = mountedAt
      return { instrumentId: id, symbol: id, displayName: id, marketType: targetListId(id) === 'crypto' ? 'crypto' : 'stock', addedAt: at, updatedAt: at }
    })
  }, [favoriteIds, metadata, mountedAt])
  useEffect(() => { saveWatchlist(watchlistItems) }, [watchlistItems])
  const isWatchlisted = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])
  const getWatchlistItem = useCallback((id: string) => watchlistItems.find(item => item.instrumentId === id), [watchlistItems])
  const addToWatchlist = useCallback((item: WatchlistItem) => {
    const valid = sanitizeItems([item])[0]
    if (!valid) return
    setMetadata(current => [...current.filter(entry => entry.instrumentId !== valid.instrumentId), { ...valid, ...(favoriteIds.has(valid.instrumentId) ? current.find(entry => entry.instrumentId === valid.instrumentId) : undefined) }])
    setWatchlists(current => current.some(list => list.instrumentIds.includes(valid.instrumentId)) ? current : current.map(list => list.id === targetListId(valid.instrumentId) ? { ...list, instrumentIds: [...list.instrumentIds, valid.instrumentId] } : list))
  }, [favoriteIds])
  const toggleWatchlist = useCallback((item: WatchlistItem) => {
    if (favoriteIds.has(item.instrumentId)) removeFromWatchlist(item.instrumentId)
    else addToWatchlist(item)
  }, [favoriteIds, removeFromWatchlist, addToWatchlist])
  const markReviewed = useCallback((id: string, snapshot: ReviewSnapshot) => {
    if (!favoriteIds.has(id)) return
    setMetadata(current => reviewItem(watchlistItems.map(item => current.find(entry => entry.instrumentId === item.instrumentId) ?? item), id, snapshot))
  }, [favoriteIds, watchlistItems])
  const value = useMemo<WatchlistValue>(() => ({
    watchlistItems, isWatchlisted, addToWatchlist, toggleWatchlist, markReviewed, getWatchlistItem, activeReview, setActiveReview,
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
  }), [watchlistItems, isWatchlisted, addToWatchlist, toggleWatchlist, markReviewed, getWatchlistItem, activeReview, activeWatchlistId, createWatchlist, deleteWatchlist, favoriteIds, recentlyViewedIds, removeFromWatchlist, reorderWatchlist, toggleFavorite, toggleInWatchlist, trackRecentlyViewed, watchlists])

  return <WatchlistContext value={value}>{children}</WatchlistContext>
}
