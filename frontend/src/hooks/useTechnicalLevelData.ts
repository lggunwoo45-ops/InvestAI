import { useEffect, useState } from 'react'

import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { marketDataService } from '@/services/market/marketDataService'
import type { MarketConnectionStatus, MarketInstrument } from '@/types/market'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type { Candle } from '@/types/marketDetail'

interface TechnicalLevelDataState {
  candles: readonly Candle[]
  currentPrice: number | null
  dataQuality: AnalysisDataQuality
  connectionStatus: MarketConnectionStatus
  isLoading: boolean
}

const emptyState: TechnicalLevelDataState = {
  candles: [],
  currentPrice: null,
  dataQuality: 'unavailable',
  connectionStatus: 'idle',
  isLoading: false,
}

/**
 * Reuses the normalized MarketDataService boundary for daily candle context.
 * Technical UI never selects an exchange adapter or fetches a provider directly.
 */
export function useTechnicalLevelData(instrument: MarketInstrument | null): TechnicalLevelDataState {
  const { marketDataMode } = useMarketWorkspace()
  const requestKey = instrument ? `${instrument.id}:1D:${marketDataMode}` : null
  const [resolved, setResolved] = useState<{ key: string | null; value: TechnicalLevelDataState }>({ key: null, value: emptyState })

  useEffect(() => {
    if (!instrument) return undefined

    return marketDataService.subscribe({
      instrument,
      timeframe: '1D',
      mode: marketDataMode,
      onState: ({ snapshot, connection }) => {
        const marketPrice = snapshot?.instrument.lastPrice
        const latestClose = snapshot?.candles.at(-1)?.close
        const currentPrice = marketPrice !== undefined && Number.isFinite(marketPrice) && marketPrice > 0
          ? marketPrice
          : latestClose !== undefined && Number.isFinite(latestClose) && latestClose > 0
            ? latestClose
            : null
        setResolved({
          key: requestKey,
          value: {
            candles: snapshot?.candles ?? [],
            currentPrice,
            dataQuality: snapshot ? connection.effectiveMode === 'live' ? 'live' : 'mock' : 'unavailable',
            connectionStatus: connection.status,
            isLoading: snapshot === null && (connection.status === 'idle' || connection.status === 'connecting'),
          },
        })
      },
    })
  }, [instrument, marketDataMode, requestKey])

  if (!instrument) return emptyState
  if (resolved.key !== requestKey) return { ...emptyState, isLoading: true }
  return resolved.value
}
