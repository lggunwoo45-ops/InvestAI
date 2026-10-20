import { useEffect, useState } from 'react'
import { loadDominance, type DominanceRead } from '@/services/cryptoAnalysis/dominanceService'

export function useDominance(enabled: boolean) {
  const [result, setResult] = useState<{ data: DominanceRead | null; loading: boolean; error: boolean }>({ data: null, loading: false, error: false })
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    const load = () => {
      setResult(previous => ({ ...previous, loading: true }))
      void loadDominance().then(data => { if (!stopped) setResult({ data, loading: false, error: false }) })
        .catch(() => { if (!stopped) setResult({ data: null, loading: false, error: true }) })
    }
    load()
    const timer = setInterval(load, 10 * 60_000)
    return () => { stopped = true; clearInterval(timer) }
  }, [enabled])
  return enabled ? result : { data: null, loading: false, error: false }
}
