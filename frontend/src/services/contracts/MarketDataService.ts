import type { AssetClass, MarketProviderId } from '@/types/platform'

export interface MarketQuote {
  symbol: string
  price: number
  changePercent: number
  capturedAt: string
}

export interface MarketDataService {
  /** Provider adapters own transport and normalization; UI consumers only see this contract. */
  readonly providerId: MarketProviderId
  supports(assetClass: AssetClass): boolean
  getQuote(symbol: string): Promise<MarketQuote>
  subscribe(symbols: readonly string[]): () => void
}
