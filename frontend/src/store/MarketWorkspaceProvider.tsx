import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'
import { MarketWorkspaceContext, type MarketWorkspaceValue } from './marketWorkspaceContext'

export function MarketWorkspaceProvider({ children }: PropsWithChildren) {
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>('1H')
  const [marketDataMode, setMarketDataMode] = useState<MarketDataMode>('live')
  const [activeMarketState, setActiveMarketState] = useState<RealtimeMarketState | null>(null)
  const clearInstrument = useCallback(() => {
    setSelectedInstrument(null)
    setActiveMarketState(null)
  }, [])
  const value = useMemo<MarketWorkspaceValue>(
    () => ({
      selectedInstrument,
      selectedTimeframe,
      marketDataMode,
      activeMarketState,
      selectInstrument: setSelectedInstrument,
      clearInstrument,
      selectTimeframe: setSelectedTimeframe,
      setMarketDataMode,
      setActiveMarketState,
    }),
    [activeMarketState, clearInstrument, marketDataMode, selectedInstrument, selectedTimeframe],
  )

  return <MarketWorkspaceContext value={value}>{children}</MarketWorkspaceContext>
}
