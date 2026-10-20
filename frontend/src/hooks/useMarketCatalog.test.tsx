import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketCatalog, MarketVenue } from '@/types/market'
import { useMarketCatalog } from './useMarketCatalog'

interface PendingRequest {
  venue: MarketVenue
  signal: AbortSignal | undefined
  resolve: (catalog: MarketCatalog) => void
  reject: (error: Error) => void
}

function catalog(venue: MarketVenue): MarketCatalog {
  return { venue, instruments: [], source: 'mock', fetchedAt: Date.now() }
}

function pendingCatalogRequests() {
  const requests: PendingRequest[] = []
  vi.spyOn(marketDataService, 'getMarketCatalog').mockImplementation((venue, _mode, _force, signal) =>
    new Promise<MarketCatalog>((resolve, reject) => { requests.push({ venue, signal, resolve, reject }) }))
  return requests
}

afterEach(() => vi.restoreAllMocks())

describe('useMarketCatalog cancellation', () => {
  it('defers an inactive market, aborts on leaving it, and requests fresh data when returning', async () => {
    const requests = pendingCatalogRequests()
    const { result, rerender } = renderHook(({ enabled }) => useMarketCatalog('upbit-krw', 'live', 0, enabled), { initialProps: { enabled: false } })
    expect(requests).toHaveLength(0)
    expect(result.current).toMatchObject({ catalog: null, loading: false })
    rerender({ enabled: true })
    expect(requests).toHaveLength(1)
    await act(async () => requests[0].resolve(catalog('upbit-krw')))
    expect(result.current.catalog).not.toBeNull()
    rerender({ enabled: false })
    expect(requests[0].signal?.aborted).toBe(true)
    expect(result.current.catalog).toBeNull()
    rerender({ enabled: true })
    expect(requests).toHaveLength(2)
    expect(result.current).toMatchObject({ catalog: null, loading: true })
    await act(async () => requests[1].reject(new Error('Refresh failed')))
    expect(result.current).toMatchObject({ catalog: null, loading: false, error: 'Refresh failed' })
  })
  it('aborts an in-flight catalog request on cleanup', () => {
    const requests = pendingCatalogRequests()
    const { unmount } = renderHook(() => useMarketCatalog('upbit-krw', 'live', 0))
    expect(requests).toHaveLength(1)
    expect(requests[0].signal?.aborted).toBe(false)
    unmount()
    expect(requests[0].signal?.aborted).toBe(true)
  })

  it('ignores a stale response after a quick venue change', async () => {
    const requests = pendingCatalogRequests()
    const { result, rerender } = renderHook(({ venue }) => useMarketCatalog(venue, 'live', 0), {
      initialProps: { venue: 'upbit-krw' as MarketVenue },
    })
    rerender({ venue: 'upbit-btc' })
    expect(requests[0].signal?.aborted).toBe(true)
    expect(requests[1].signal?.aborted).toBe(false)
    await act(async () => { requests[0].resolve(catalog('upbit-krw')) })
    expect(result.current.catalog).toBeNull()
    expect(result.current.loading).toBe(true)
    await act(async () => { requests[1].resolve(catalog('upbit-btc')) })
    expect(result.current.catalog?.venue).toBe('upbit-btc')
    expect(result.current.error).toBeNull()
  })

  it('does not surface AbortError to the user', async () => {
    const requests = pendingCatalogRequests()
    const { result } = renderHook(() => useMarketCatalog('upbit-usdt', 'live', 0))
    await act(async () => { requests[0].reject(new DOMException('Cancelled', 'AbortError')) })
    expect(result.current.error).toBeNull()
  })
  it('exposes previous data separately from a failed live result and isolates venues', async () => {
    const requests = pendingCatalogRequests()
    const previous = { ...catalog('upbit-krw'), source: 'live' as const }
    vi.spyOn(marketDataService, 'getRecentCatalog').mockImplementation((venue, mode) => venue === 'upbit-krw' && mode === 'live' ? previous : null)
    const { result, rerender } = renderHook(({ venue }) => useMarketCatalog(venue, 'live', 0), { initialProps: { venue: 'upbit-krw' as MarketVenue } })
    expect(result.current.catalog).toBeNull()
    expect(result.current.cachedCatalog).toBe(previous)
    await act(async () => requests[0].reject(new Error('Upbit rate-limit (429)')))
    expect(result.current).toMatchObject({ catalog: null, cachedCatalog: previous, loading: false, error: 'Upbit rate-limit (429)' })
    rerender({ venue: 'upbit-btc' })
    expect(result.current.catalog).toBeNull()
    expect(result.current.cachedCatalog).toBeNull()
    await act(async () => requests[1].resolve(catalog('upbit-btc')))
    expect(result.current.cachedCatalog).toBeNull()
    expect(result.current.catalog?.venue).toBe('upbit-btc')
  })
})
