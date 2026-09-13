import { useEffect, useState } from 'react'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketSectionData } from '@/types/market'

interface MarketOverviewState {
  sections: readonly MarketSectionData[]
  isLoading: boolean
  error: string | null
}

export function useMarketOverview(): MarketOverviewState {
  const [state, setState] = useState<MarketOverviewState>({
    sections: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let isActive = true

    marketDataService.getMarketOverview()
      .then((sections) => {
        if (isActive) setState({ sections, isLoading: false, error: null })
      })
      .catch(() => {
        if (isActive) setState({ sections: [], isLoading: false, error: 'Market data is unavailable.' })
      })

    return () => { isActive = false }
  }, [])

  return state
}
