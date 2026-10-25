import { useEffect, useEffectEvent, useState } from 'react'

import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import type { MarketConnectionStatus, MarketInstrument } from '@/types/market'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type { Candle, ChartTimeframe, RecentTrade } from '@/types/marketDetail'

export interface TechnicalLevelDataState {
  candles: readonly Candle[]
  currentPrice: number | null
  dataQuality: AnalysisDataQuality
  connectionStatus: MarketConnectionStatus
  isLoading: boolean
  recentTrades: readonly RecentTrade[]
  updatedAt: number | null
  marketTime?: number
}

const emptyState: TechnicalLevelDataState = {
  candles: [],
  currentPrice: null,
  dataQuality: 'unavailable',
  connectionStatus: 'idle',
  isLoading: false,
  recentTrades: [],
  updatedAt: null,
}

/**
 * Reuses the normalized MarketDataService boundary for the requested candle interval.
 * Technical UI never selects an exchange adapter or fetches a provider directly.
 */
export function useTechnicalLevelData(instrument: MarketInstrument | null, timeframe: ChartTimeframe = '1D', priority = 10): TechnicalLevelDataState {
  const { marketDataMode } = useMarketWorkspace()
  const requestKey = instrument ? `${instrument.id}:${timeframe}:${marketDataMode}` : null
  const readSubscriptionInstrument = useEffectEvent(() => instrument)
  const [resolved, setResolved] = useState<{ key: string | null; value: TechnicalLevelDataState }>({ key: null, value: emptyState })

  useEffect(() => {
    const subscriptionInstrument = readSubscriptionInstrument()
    if (!subscriptionInstrument) return undefined

    let active = true
    let published: TechnicalLevelDataState | null = null
    const unsubscribe = marketDataService.subscribe({
      instrument: subscriptionInstrument,
      timeframe,
      mode: marketDataMode,
      priority,
      onState: ({ snapshot, connection }) => {
        if (!active) return
        const marketPrice = snapshot?.instrument.lastPrice
        const latestClose = snapshot?.candles.at(-1)?.close
        const currentPrice = marketPrice !== undefined && Number.isFinite(marketPrice) && marketPrice > 0
          ? marketPrice
          : latestClose !== undefined && Number.isFinite(latestClose) && latestClose > 0
            ? latestClose
            : null
        const value: TechnicalLevelDataState = {
          candles: snapshot?.candles ?? emptyState.candles,
          currentPrice,
          dataQuality: snapshot ? connection.effectiveMode === 'live' ? 'live' : 'mock' : 'unavailable',
          connectionStatus: connection.status,
          isLoading: snapshot === null && (connection.status === 'idle' || connection.status === 'connecting'),
          recentTrades: snapshot?.recentTrades ?? emptyState.recentTrades,
          updatedAt: connection.lastUpdatedAt,
          marketTime: connection.marketTime,
        }
        // Orderbook events do not change technical analysis. Keep every price,
        // trade, receipt time and connection transition; no timer or sampling.
        if (published && published.candles === value.candles
          && published.currentPrice === value.currentPrice
          && published.dataQuality === value.dataQuality
          && published.connectionStatus === value.connectionStatus
          && published.isLoading === value.isLoading
          && published.recentTrades === value.recentTrades
          && published.updatedAt === value.updatedAt
          && published.marketTime === value.marketTime) return
        published = value
        setResolved({ key: requestKey, value })
      },
    })
    return () => { active = false; unsubscribe() }
  }, [marketDataMode, requestKey, timeframe, priority])

  if (!instrument) return emptyState
  if (resolved.key !== requestKey) return { ...emptyState, isLoading: true }
  return resolved.value
}
