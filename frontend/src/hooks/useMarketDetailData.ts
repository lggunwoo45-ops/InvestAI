import { useEffect, useEffectEvent, useState } from 'react'

import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import type { ChartPreview } from '@/services/market/chartHistoryCache'
import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'

interface MarketDetailDataState {
  preview?: ChartPreview | null
  state: RealtimeMarketState | null
  isLoading: boolean
  error: string | null
}

export function useMarketDetailData(instrument: MarketInstrument | null, timeframe: ChartTimeframe): MarketDetailDataState {
  const { marketDataMode, setActiveMarketState } = useMarketWorkspace()
  const requestKey = instrument ? `${instrument.id}:${timeframe}:${marketDataMode}` : null
  const readInstrument = useEffectEvent(() => instrument)
  const [resolved, setResolved] = useState<{
    requestKey: string | null
    state: RealtimeMarketState | null
    error: string | null
  }>({ requestKey: null, state: null, error: null })

  useEffect(() => {
    const selected = readInstrument()
    if (!selected) {
      setActiveMarketState(null)
      return undefined
    }

    let active = true
    const unsubscribe = marketDataService.subscribe({
      instrument: selected,
      timeframe,
      mode: marketDataMode,
      priority: 20,
      onState: (state) => {
        if (!active) return
        setResolved({ requestKey, state, error: null })
        setActiveMarketState(state)
      },
    })

    return () => {
      active = false
      unsubscribe()
      setActiveMarketState(null)
    }
  }, [marketDataMode, requestKey, setActiveMarketState, timeframe])

  if (!instrument) return { state: null, isLoading: false, error: null }
  const preview = marketDataService.getChartPreview(instrument, timeframe, marketDataMode)
  if (resolved.requestKey !== requestKey) return { state: null, preview, isLoading: true, error: null }
  return {
    preview: resolved.state?.snapshot ? null : preview,
    state: resolved.state,
    isLoading: resolved.state?.snapshot === null,
    error: resolved.error,
  }
}
