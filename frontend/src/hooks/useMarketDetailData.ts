import { useEffect, useState } from 'react'

import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'

interface MarketDetailDataState {
  state: RealtimeMarketState | null
  isLoading: boolean
  error: string | null
}

export function useMarketDetailData(instrument: MarketInstrument | null, timeframe: ChartTimeframe): MarketDetailDataState {
  const { marketDataMode, setActiveMarketState } = useMarketWorkspace()
  const requestKey = instrument ? `${instrument.id}:${timeframe}:${marketDataMode}` : null
  const [resolved, setResolved] = useState<{
    requestKey: string | null
    state: RealtimeMarketState | null
    error: string | null
  }>({ requestKey: null, state: null, error: null })

  useEffect(() => {
    if (!instrument) {
      setActiveMarketState(null)
      return undefined
    }

    return marketDataService.subscribe({
      instrument,
      timeframe,
      mode: marketDataMode,
      onState: (state) => {
        setResolved({ requestKey, state, error: null })
        setActiveMarketState(state)
      },
    })
  }, [instrument, marketDataMode, requestKey, setActiveMarketState, timeframe])

  if (!instrument) return { state: null, isLoading: false, error: null }
  if (resolved.requestKey !== requestKey) return { state: null, isLoading: true, error: null }
  return {
    state: resolved.state,
    isLoading: resolved.state?.snapshot === null,
    error: resolved.error,
  }
}
