import type { MarketInstrument, MarketConnectionStatus } from '@/types/market'
import type { Candle, ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'

export interface ProviderStreamEvent {
  snapshot?: MarketDetailSnapshot
  status?: MarketConnectionStatus
  reconnectAttempt?: number
  message?: string
  /** Local receipt time of a valid quote. null means no new quote. */
  quoteUpdatedAt?: number | null
  marketTime?: number
}

export interface RealtimeMarketProvider {
  readonly id: string
  supports(instrument: MarketInstrument): boolean
  loadDailyHistory?(instrument: MarketInstrument, signal: AbortSignal): Promise<readonly Candle[]>
  loadSnapshot(instrument: MarketInstrument, timeframe: ChartTimeframe, signal?: AbortSignal, priority?: () => number): Promise<MarketDetailSnapshot>
  subscribe(
    instrument: MarketInstrument,
    timeframe: ChartTimeframe,
    initialSnapshot: MarketDetailSnapshot,
    onEvent: (event: ProviderStreamEvent) => void,
    priority?: () => number,
  ): () => void
}
