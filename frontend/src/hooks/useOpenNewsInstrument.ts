import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { marketDataService } from '@/services/market/marketDataService'
import { useMarketWorkspace } from './useMarketWorkspace'
import { useWatchlists } from './useWatchlists'

/** An explicit news action is the only point that updates active chart context. */
export function useOpenNewsInstrument() {
  const navigate = useNavigate()
  const { selectInstrument } = useMarketWorkspace()
  const { trackRecentlyViewed } = useWatchlists()

  const openInstrument = useCallback((id: string) => {
    const instrument = marketDataService.getKnownInstruments([id]).get(id)
    if (!instrument) return
    marketDataService.rememberInstrument(instrument)
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
    navigate('/market')
  }, [navigate, selectInstrument, trackRecentlyViewed])

  const canOpenInstrument = useCallback((id: string) => marketDataService.getKnownInstruments([id]).has(id), [])
  return { openInstrument, canOpenInstrument }
}
