import type { MarketInstrument } from '@/types/market'
import type { RecentTrade } from '@/types/marketDetail'

export interface TradeProvider {
  getRecentTrades(instrument: MarketInstrument): Promise<readonly RecentTrade[]>
}
