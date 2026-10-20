import { useEffect, useState } from 'react'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketCatalog, MarketDataMode, MarketVenue } from '@/types/market'

interface CatalogState {
  catalog: MarketCatalog | null
  cachedCatalog?: MarketCatalog | null
  loading: boolean
  error: string | null
  loadingMilliseconds: number | null
}

export function useMarketCatalog(venue: MarketVenue, mode: MarketDataMode, retry: number, enabled = true): CatalogState {
  const key = `${venue}:${mode}:${retry}`
  const [result, setResult] = useState<CatalogState & { key: string; enabled: boolean }>({
    key: '', enabled, catalog: null, loading: true, error: null, loadingMilliseconds: null,
  })
  // Reset on activation changes so re-entering a market never labels an old result as fresh.
  if (result.enabled !== enabled) setResult({ key: '', enabled, catalog: null, loading: enabled, error: null, loadingMilliseconds: null })

  useEffect(() => {
    if (!enabled) return
    let active = true
    const controller = new AbortController()
    const started = performance.now()
    marketDataService.getMarketCatalog(venue, mode, retry > 0, controller.signal).then((catalog) => {
      if (active) setResult({ key, enabled, catalog, loading: false, error: null, loadingMilliseconds: performance.now() - started })
    }).catch((error: unknown) => {
      if (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return
      if (active) setResult({ key, enabled, catalog: null, loading: false, error: error instanceof Error ? error.message : 'Unknown catalog error', loadingMilliseconds: performance.now() - started })
    })
    return () => { active = false; controller.abort() }
  }, [key, venue, mode, retry, enabled])

  if (!enabled) return { catalog: null, cachedCatalog: null, loading: false, error: null, loadingMilliseconds: null }
  return result.key === key
    ? { ...result, cachedCatalog: result.catalog ? null : marketDataService.getRecentCatalog(venue, mode) }
    : { catalog: null, cachedCatalog: marketDataService.getRecentCatalog(venue, mode), loading: true, error: null, loadingMilliseconds: null }
}
