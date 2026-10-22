import { useCallback, useEffect, useState } from 'react'
import { loadStockSnapshot, StockDataError, type StockSnapshot } from '@/services/stocks/stockData'

export function useStockSnapshot(symbol: string | null) {
  const [state, setState] = useState<{ symbol: string | null; data: StockSnapshot | null; loading: boolean; error: StockDataError | null; checkedAt: number }>({ symbol: null, data: null, loading: false, error: null, checkedAt: 0 })
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(n => n + 1), [])
  useEffect(() => {
    if (!symbol) return
    let cancelled = false, running = false
    const run = async () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      setState(previous => ({ symbol, data: previous.symbol === symbol ? previous.data : null, loading: true, error: previous.symbol === symbol ? previous.error : null, checkedAt: Date.now() }))
      try {
        const data = await loadStockSnapshot(symbol)
        if (!cancelled) setState({ symbol, data, loading: false, error: null, checkedAt: Date.now() })
      } catch (error) {
        // Keep the last view, but explicitly suspend analysis/valuation after a refresh failure.
        if (!cancelled) setState(previous => ({ symbol, data: previous.symbol === symbol ? previous.data : null, loading: false, error: error instanceof StockDataError ? error : new StockDataError('stock_unavailable'), checkedAt: Date.now() }))
      } finally { running = false }
    }
    void run()
    const timer = setInterval(() => void run(), 30_000)
    const visible = () => { if (document.visibilityState === 'visible') void run() }
    document.addEventListener('visibilitychange', visible)
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [symbol, revision])
  return { ...(symbol && state.symbol === symbol ? state : { data: null, loading: Boolean(symbol), error: null, checkedAt: 0 }), refresh }
}
