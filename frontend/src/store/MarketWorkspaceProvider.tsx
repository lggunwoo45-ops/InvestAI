import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'
import { MarketWorkspaceContext, type MarketWorkspaceValue } from './marketWorkspaceContext'
import { productScope } from '@/app/productScope'

export function MarketWorkspaceProvider({ children }: PropsWithChildren) {
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>('1H')
  const [marketDataMode, setMarketDataMode] = useState<MarketDataMode>('live')
  const [activeMarketState, setActiveMarketState] = useState<RealtimeMarketState | null>(null)
  const selectInstrument = useCallback((instrument: MarketInstrument) => {
    if (productScope.allowsInstrument(instrument)) setSelectedInstrument(instrument)
  }, [])
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
      selectInstrument,
      clearInstrument,
      selectTimeframe: setSelectedTimeframe,
      setMarketDataMode,
      setActiveMarketState,
    }),
    [activeMarketState, clearInstrument, marketDataMode, selectInstrument, selectedInstrument, selectedTimeframe],
  )

  return <MarketWorkspaceContext value={value}>{children}</MarketWorkspaceContext>
}
