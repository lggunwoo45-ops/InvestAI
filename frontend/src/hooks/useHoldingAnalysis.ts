import { useEffect, useRef, useState } from 'react'
import { analyzeHoldings, type HoldingReview } from '@/services/portfolio/holdingAnalysis'
import type { Position } from '@/services/portfolio/portfolioStorage'

export function useHoldingAnalysis(positions: readonly Position[], live: boolean) {
  // Record edits invalidate the run too: never label a changed holding with an earlier review.
  const identity = `${live}:${JSON.stringify(positions)}`
  const [batch, setBatch] = useState<{ identity: string; reviews: Record<string, HoldingReview>; status: 'idle' | 'running' | 'done' | 'stopped' | 'error' }>({ identity, reviews: {}, status: 'idle' })
  const [now, setNow] = useState(Date.now)
  const controller = useRef<AbortController | null>(null)
  if (batch.identity !== identity) setBatch({ identity, reviews: {}, status: 'idle' })
  useEffect(() => () => controller.current?.abort(), [identity])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer) }, [])
  const current = batch.identity === identity && live
  const start = async () => {
    if (!live) return
    controller.current?.abort()
    const run = new AbortController()
    controller.current = run
    setNow(Date.now()); setBatch({ identity, reviews: {}, status: 'running' })
    try {
      await analyzeHoldings(positions, { signal: run.signal, onResult: review => {
        if (!run.signal.aborted) { setNow(Date.now()); setBatch(previous => ({ ...previous, reviews: { ...previous.reviews, [review.positionId]: review } })) }
      } })
      if (!run.signal.aborted) setBatch(previous => ({ ...previous, status: 'done' }))
    } catch { if (!run.signal.aborted) setBatch(previous => ({ ...previous, status: 'error' })) }
  }
  return {
    reviews: current ? batch.reviews : {}, status: current ? batch.status : 'idle', now,
    start, stop: () => { controller.current?.abort(); setBatch(previous => ({ ...previous, status: 'stopped' })) },
  }
}
