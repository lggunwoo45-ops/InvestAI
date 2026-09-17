import type { MarketCatalog, MarketDataMode, MarketVenue } from '@/types/market'

/** Catalog discovery is separate from a single-instrument realtime subscription. */
export interface MarketCatalogProvider {
  readonly id: string
  supports(venue: MarketVenue, mode: MarketDataMode): boolean
  load(venue: MarketVenue, signal?: AbortSignal): Promise<MarketCatalog>
}
