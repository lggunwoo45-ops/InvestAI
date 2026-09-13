import type { MarketInstrument } from '@/types/market'
import type { OrderbookSnapshot } from '@/types/marketDetail'

export interface OrderbookProvider {
  getOrderbook(instrument: MarketInstrument): Promise<OrderbookSnapshot>
}
