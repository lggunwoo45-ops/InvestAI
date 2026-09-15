import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PropsWithChildren } from 'react'

import { useWatchlists } from '@/hooks/useWatchlists'
import { WatchlistProvider } from '@/store/WatchlistProvider'
import { defaultWatchlists, MAX_CUSTOM_WATCHLISTS, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { loadStoredRecentlyViewed, loadStoredWatchlists } from '@/utils/watchlistStorage'

const WATCHLIST_KEY = 'investai.watchlists.v2'
const RECENT_KEY = 'investai.recently-viewed.v1'

function wrapper({ children }: PropsWithChildren) {
  return <WatchlistProvider>{children}</WatchlistProvider>
}

describe('WatchlistProvider storage safety', () => {
  beforeEach(() => window.localStorage.clear())

  it.each([
    '{"corrupted":true}',
    '"hello"',
    '42',
    '[{"id":"crypto"}]',
  ])('recovers from invalid watchlist storage: %s', (storedValue) => {
    window.localStorage.setItem(WATCHLIST_KEY, storedValue)

    expect(loadStoredWatchlists()).toEqual(defaultWatchlists)
    expect(window.localStorage.getItem(WATCHLIST_KEY)).toBeNull()
  })

  it('loads a valid schema and persists a valid roundtrip', async () => {
    const saved = [{ id: 'crypto', name: 'Crypto', instrumentIds: ['upbit-xrp'], isDefault: true }]
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, watchlists: saved }))
    const first = renderHook(() => useWatchlists(), { wrapper })

    expect(first.result.current.watchlists).toEqual(saved)
    act(() => first.result.current.toggleFavorite('upbit-btc'))
    await waitFor(() => expect(window.localStorage.getItem(WATCHLIST_KEY)).toContain('upbit-btc'))
    first.unmount()

    const second = renderHook(() => useWatchlists(), { wrapper })
    expect(second.result.current.favoriteIds.has('upbit-btc')).toBe(true)
  })

  it('recovers invalid recently viewed storage', () => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify({ schemaVersion: WATCHLIST_SCHEMA_VERSION, recentlyViewedIds: [42] }))
    expect(loadStoredRecentlyViewed()).toEqual([])
    expect(window.localStorage.getItem(RECENT_KEY)).toBeNull()
  })

  it('creates unique custom watchlists and deletes only custom lists', () => {
    const { result } = renderHook(() => useWatchlists(), { wrapper })
    act(() => result.current.createWatchlist('Momentum'))
    act(() => result.current.createWatchlist('momentum'))

    const customLists = result.current.watchlists.filter((list) => !list.isDefault)
    expect(customLists).toHaveLength(1)
    act(() => result.current.deleteWatchlist(customLists[0]!.id))
    expect(result.current.watchlists.some((list) => list.name === 'Momentum')).toBe(false)
    act(() => result.current.deleteWatchlist('crypto'))
    expect(result.current.watchlists.some((list) => list.id === 'crypto')).toBe(true)
  })

  it('limits the number of custom watchlists', () => {
    const { result } = renderHook(() => useWatchlists(), { wrapper })
    for (let index = 0; index < MAX_CUSTOM_WATCHLISTS + 1; index += 1) {
      act(() => result.current.createWatchlist(`List ${index}`))
    }
    expect(result.current.watchlists.filter((list) => !list.isDefault)).toHaveLength(MAX_CUSTOM_WATCHLISTS)
  })

  it('adds and removes a favorite through its market watchlist', () => {
    const { result } = renderHook(() => useWatchlists(), { wrapper })
    act(() => result.current.toggleFavorite('upbit-xrp'))
    expect(result.current.favoriteIds.has('upbit-xrp')).toBe(true)
    expect(result.current.watchlists.find((list) => list.id === 'crypto')?.instrumentIds).toContain('upbit-xrp')
    act(() => result.current.toggleFavorite('upbit-xrp'))
    expect(result.current.favoriteIds.has('upbit-xrp')).toBe(false)
  })
})
