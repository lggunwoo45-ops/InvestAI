import type { MarketId, MarketInstrument } from '@/types/market'

export type MarketRegion = 'crypto' | 'korea' | 'us'
export type MarketSessionStatus = 'always-open' | 'open' | 'closed'
export type NewsCategory = 'crypto' | 'korea-stock' | 'us-stock' | 'macro' | 'technology' | 'ai' | 'earnings' | 'regulation'
export type NewsSentiment = 'positive' | 'neutral' | 'negative' | 'unassessed'
export type NewsImportance = 'low' | 'medium' | 'high' | 'unassessed'
export type NewsMarket = MarketRegion | 'macro'
export type DiscoverSectionId = 'trending' | 'gainers' | 'losers' | 'volume'

export interface MarketPulseItem {
  id: string
  symbol: string
  name: string
  region: MarketRegion
  price: number
  quote: 'KRW' | 'USD'
  changePercent: number
}

export interface NewsArticle {
  id: string
  category: NewsCategory
  title: string
  source: string
  publishedAt: string
  relatedSymbols: readonly string[]
  /** Explicit symbol-to-internal-ID links; index-only symbols remain non-interactive. */
  relatedInstrumentIds?: Readonly<Record<string, string>>
  relatedMarkets: readonly NewsMarket[]
  sentiment: NewsSentiment
  importance: NewsImportance
  summary: string
  /** Only HTTPS links may be rendered by the UI. Mock articles do not carry links. */
  url?: string
  isMock: boolean
  thumbnailTone?: 'teal' | 'amber' | 'blue' | 'slate'
}

export interface DiscoverAsset {
  id: string
  instrumentId: string
  marketId: MarketId
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  quote: string
  instrument?: MarketInstrument
  unavailable?: boolean
}

export interface Watchlist {
  id: string
  name: string
  instrumentIds: readonly string[]
  isDefault: boolean
}
