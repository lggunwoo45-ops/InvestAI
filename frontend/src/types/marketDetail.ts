import type { MarketConnectionState, MarketInstrument } from './market'

export type ChartTimeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D'

export const chartTimeframes: readonly ChartTimeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D']

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderbookLevel {
  price: number
  amount: number
  total: number
}

export interface OrderbookSnapshot {
  symbolId: string
  asks: readonly OrderbookLevel[]
  bids: readonly OrderbookLevel[]
  spread: number
}

export interface RecentTrade {
  id: string
  timestamp: number
  price: number
  amount: number
  side: 'buy' | 'sell'
}

export interface MarketDetailSnapshot {
  instrument: MarketInstrument
  timeframe: ChartTimeframe
  candles: readonly Candle[]
  orderbook: OrderbookSnapshot
  recentTrades: readonly RecentTrade[]
}

export interface RealtimeMarketState {
  snapshot: MarketDetailSnapshot | null
  connection: MarketConnectionState
}
