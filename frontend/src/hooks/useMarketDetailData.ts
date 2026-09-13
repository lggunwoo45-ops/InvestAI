import { useEffect, useState } from 'react'

import { marketDetailServices } from '@/services/market-detail/marketDetailServices'
import type { MarketInstrument } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'

interface MarketDetailDataState {
  snapshot: MarketDetailSnapshot | null
  isLoading: boolean
  error: string | null
}

export function useMarketDetailData(instrument: MarketInstrument | null, timeframe: ChartTimeframe): MarketDetailDataState {
  const requestKey = instrument ? `${instrument.id}:${timeframe}` : null
  const [resolved, setResolved] = useState<{
    requestKey: string | null
    snapshot: MarketDetailSnapshot | null
    error: string | null
  }>({ requestKey: null, snapshot: null, error: null })

  useEffect(() => {
    let isActive = true
    if (!instrument) return () => { isActive = false }

    Promise.all([
      marketDetailServices.chartProvider.getCandles(instrument, timeframe),
      marketDetailServices.orderbookProvider.getOrderbook(instrument),
      marketDetailServices.tradeProvider.getRecentTrades(instrument),
    ])
      .then(([candles, orderbook, recentTrades]) => {
        if (isActive) {
          setResolved({
            requestKey,
            snapshot: { instrument, timeframe, candles, orderbook, recentTrades },
            error: null,
          })
        }
      })
      .catch(() => {
        if (isActive) setResolved({ requestKey, snapshot: null, error: 'Market detail data is unavailable.' })
      })

    return () => { isActive = false }
  }, [instrument, requestKey, timeframe])

  if (!instrument) return { snapshot: null, isLoading: false, error: null }
  if (resolved.requestKey !== requestKey) return { snapshot: null, isLoading: true, error: null }
  return { snapshot: resolved.snapshot, isLoading: false, error: resolved.error }
}
