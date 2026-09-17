import { useEffect, useState } from 'react'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketCatalog, MarketDataMode, MarketVenue } from '@/types/market'

interface CatalogState {
  catalog: MarketCatalog | null
  loading: boolean
  error: string | null
  loadingMilliseconds: number | null
}

export function useMarketCatalog(venue: MarketVenue, mode: MarketDataMode, retry: number): CatalogState {
  const key = `${venue}:${mode}:${retry}`
  const [result, setResult] = useState<CatalogState & { key: string }>({
    key: '', catalog: null, loading: true, error: null, loadingMilliseconds: null,
  })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const started = performance.now()
    marketDataService.getMarketCatalog(venue, mode, retry > 0, controller.signal).then((catalog) => {
      if (active) setResult({ key, catalog, loading: false, error: null, loadingMilliseconds: performance.now() - started })
    }).catch((error: unknown) => {
      if (error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return
      if (active) setResult({ key, catalog: null, loading: false, error: error instanceof Error ? error.message : 'Unknown catalog error', loadingMilliseconds: performance.now() - started })
    })
    return () => { active = false; controller.abort() }
  }, [key, venue, mode, retry])

  return result.key === key
    ? result
    : { catalog: null, loading: true, error: null, loadingMilliseconds: null }
}
