import type { MarketId } from '@/types/market'

export type MarketRegion = 'crypto' | 'korea' | 'us'
export type MarketSessionStatus = 'always-open' | 'open' | 'closed'
export type NewsCategory = 'crypto' | 'stocks' | 'economy' | 'technology'
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
  quote: 'KRW' | 'USDT' | 'USD'
}

export interface Watchlist {
  id: string
  name: string
  instrumentIds: readonly string[]
  isDefault: boolean
}
