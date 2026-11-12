import { useEffect, useEffectEvent, useState } from 'react'
import type { MarketInstrument } from '@/types/market'
import type { DailyHistory } from '@/services/market/providers/dailyHistory'
import { marketDataService } from '@/services/market/marketDataService'
export function useMajorSupportHistory(instrument: MarketInstrument, live: boolean) {
  const key = JSON.stringify([instrument.id, instrument.marketId, instrument.providerSymbol, instrument.quoteCurrency, live])
  const readInstrument = useEffectEvent(() => instrument)
  const [result, setResult] = useState<{ key: string; data: DailyHistory | null; failed: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!live) return
    let active = true
    const controller = new AbortController()
    const load = () => { void marketDataService.getLongTermHistory(readInstrument(), controller.signal).then(
      data => { if (active) setResult({ key, data, failed: false }) },
      () => { if (active) setResult({ key, data: null, failed: true }) },
    ) }
    load(); const timer = setInterval(load, 900_000)
    return () => { active = false; controller.abort(); clearInterval(timer) }
  }, [key, live, attempt])
  return { data: result?.key === key && live ? result.data : null, loading: live && result?.key !== key, failed: result?.key === key && result.failed, retry: () => { setResult(null); setAttempt(v => v + 1) } }
}
