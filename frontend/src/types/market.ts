export type MarketId = 'upbit' | 'binance-spot' | 'binance-futures' | 'korea-stock' | 'us-stock'

export type QuoteCurrency = string

export type MarketGroup = 'crypto' | 'korea' | 'us'
export type MarketVenue = 'upbit-krw' | 'upbit-btc' | 'upbit-usdt' | 'binance-spot' | 'binance-futures' | 'kospi' | 'kosdaq' | 'nasdaq' | 'nyse'
export type MarketProviderType = 'upbit' | 'binance-spot' | 'binance-futures' | 'mock-krx' | 'mock-us'

export type MarketDataMode = 'live' | 'mock'

export type MarketConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'disconnected'
  | 'mock'
  | 'unsupported'

export interface MarketInstrument {
  id: string
  marketId: MarketId
  symbol: string
  name: string
  /** Stable internal identity for future automation. Never place exchange symbols in watchlist IDs. */
  providerSymbol?: string
  displaySymbol?: string
  marketType?: MarketVenue
  providerType?: MarketProviderType
  koreanName?: string
  englishName?: string
  quoteCurrency: QuoteCurrency
  lastPrice: number
  change24hPercent: number
  volume24h: number
}

export interface MarketCatalog {
  venue: MarketVenue
  instruments: readonly MarketInstrument[]
  source: 'live' | 'mock'
  fetchedAt: number
}

export interface MarketSectionData {
  id: MarketId
  name: string
  description: string
  sessionLabel: string
  instruments: readonly MarketInstrument[]
}

export interface MarketConnectionState {
  requestedMode: MarketDataMode
  effectiveMode: MarketDataMode
  status: MarketConnectionStatus
  provider: string
  reconnectAttempt: number
  lastUpdatedAt: number | null
  message: string
}
