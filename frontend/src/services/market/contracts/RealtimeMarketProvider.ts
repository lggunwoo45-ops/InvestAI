import type { MarketInstrument, MarketConnectionStatus } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'

export interface ProviderStreamEvent {
  snapshot?: MarketDetailSnapshot
  status?: MarketConnectionStatus
  reconnectAttempt?: number
  message?: string
}

export interface RealtimeMarketProvider {
  readonly id: string
  supports(instrument: MarketInstrument): boolean
  loadSnapshot(instrument: MarketInstrument, timeframe: ChartTimeframe, signal?: AbortSignal): Promise<MarketDetailSnapshot>
  subscribe(
    instrument: MarketInstrument,
    timeframe: ChartTimeframe,
    initialSnapshot: MarketDetailSnapshot,
    onEvent: (event: ProviderStreamEvent) => void,
  ): () => void
}
