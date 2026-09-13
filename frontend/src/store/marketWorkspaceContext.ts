import { createContext } from 'react'

import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe } from '@/types/marketDetail'

export interface MarketWorkspaceValue {
  selectedInstrument: MarketInstrument | null
  selectedTimeframe: ChartTimeframe
  selectInstrument: (instrument: MarketInstrument) => void
  clearInstrument: () => void
  selectTimeframe: (timeframe: ChartTimeframe) => void
}

export const MarketWorkspaceContext = createContext<MarketWorkspaceValue | null>(null)
