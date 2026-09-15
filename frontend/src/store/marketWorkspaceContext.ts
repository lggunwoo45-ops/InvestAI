import { createContext } from 'react'

import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'

export interface MarketWorkspaceValue {
  selectedInstrument: MarketInstrument | null
  selectedTimeframe: ChartTimeframe
  marketDataMode: MarketDataMode
  activeMarketState: RealtimeMarketState | null
  selectInstrument: (instrument: MarketInstrument) => void
  clearInstrument: () => void
  selectTimeframe: (timeframe: ChartTimeframe) => void
  setMarketDataMode: (mode: MarketDataMode) => void
  setActiveMarketState: (state: RealtimeMarketState | null) => void
}

export const MarketWorkspaceContext = createContext<MarketWorkspaceValue | null>(null)
