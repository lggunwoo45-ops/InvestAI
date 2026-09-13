export type MarketId = 'upbit' | 'binance-futures' | 'korea-stock' | 'us-stock'

export type QuoteCurrency = 'KRW' | 'USDT' | 'USD'

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
