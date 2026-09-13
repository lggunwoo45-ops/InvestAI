import { useMemo, useState, type PropsWithChildren } from 'react'

import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe } from '@/types/marketDetail'
import { MarketWorkspaceContext, type MarketWorkspaceValue } from './marketWorkspaceContext'

export function MarketWorkspaceProvider({ children }: PropsWithChildren) {
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>('1H')
  const value = useMemo<MarketWorkspaceValue>(
    () => ({
      selectedInstrument,
      selectedTimeframe,
      selectInstrument: setSelectedInstrument,
      clearInstrument: () => setSelectedInstrument(null),
      selectTimeframe: setSelectedTimeframe,
    }),
    [selectedInstrument, selectedTimeframe],
  )

  return <MarketWorkspaceContext value={value}>{children}</MarketWorkspaceContext>
}
