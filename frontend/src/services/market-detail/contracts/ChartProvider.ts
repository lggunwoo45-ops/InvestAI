import type { MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe } from '@/types/marketDetail'

export interface ChartProvider {
  getCandles(instrument: MarketInstrument, timeframe: ChartTimeframe): Promise<readonly Candle[]>
}
