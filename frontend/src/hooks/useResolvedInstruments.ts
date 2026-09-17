import { useEffect, useMemo, useState } from 'react'

import { marketDataService } from '@/services/market/marketDataService'
import type { MarketDataMode, MarketInstrument } from '@/types/market'

export function useResolvedInstruments(ids: readonly string[], mode: MarketDataMode) {
  const key = ids.join('\u001f')
  const stableIds = useMemo(() => [...ids], [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState<{ key: string; values: ReadonlyMap<string, MarketInstrument> }>({ key: '', values: new Map() })
  useEffect(() => {
    let active = true
    marketDataService.resolveInstruments(stableIds, mode).then((values) => {
      if (active) setState({ key: `${mode}:${key}`, values })
    })
    return () => { active = false }
  }, [key, mode, stableIds])
  return state.key === `${mode}:${key}` ? state.values : marketDataService.getKnownInstruments(stableIds)
}
