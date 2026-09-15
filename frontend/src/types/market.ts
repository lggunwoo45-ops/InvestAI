export type MarketId = 'upbit' | 'binance-futures' | 'korea-stock' | 'us-stock'

export type QuoteCurrency = 'KRW' | 'USDT' | 'USD'

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
  quoteCurrency: QuoteCurrency
  lastPrice: number
  change24hPercent: number
  volume24h: number
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
