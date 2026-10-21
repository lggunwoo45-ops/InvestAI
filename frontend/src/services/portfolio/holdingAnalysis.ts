import { marketDataService } from '@/services/market/marketDataService'
import { inspectInstrument, type ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { Position } from './portfolioStorage'

export type HoldingIssue = 'catalog' | 'missing' | 'analysis'
export interface HoldingReview { positionId: string; result: ScanResult | null; issue?: HoldingIssue }
export const holdingKey = (p: Position) => `${p.venue}:${p.instrumentId}:${p.quoteCurrency}`

/** All open holdings, including those outside the discovery top 12. Duplicate lots share one scan. */
export async function analyzeHoldings(positions: readonly Position[], {
  signal, onResult, inspect = inspectInstrument, catalog = marketDataService.getMarketCatalog.bind(marketDataService), now = Date.now,
}: {
  signal: AbortSignal; onResult: (review: HoldingReview) => void
  inspect?: typeof inspectInstrument; catalog?: typeof marketDataService.getMarketCatalog; now?: () => number
}) {
  if (signal.aborted) return
  const groups = new Map<string, Position[]>()
  for (const p of positions.filter(p => p.quantity > 0)) groups.set(holdingKey(p), [...(groups.get(holdingKey(p)) ?? []), p])
  const venues = [...new Set(positions.filter(p => p.quantity > 0).map(p => p.venue))]
  const catalogs = new Map(await Promise.all(venues.map(async venue => {
    try {
      const data = await catalog(venue, 'live', true, signal)
      const at = now()
      if (data.source !== 'live' || !Number.isFinite(data.fetchedAt) || at - data.fetchedAt > 60_000 || data.fetchedAt > at + 5000) return [venue, null] as const
      return [venue, data] as const
    } catch { return [venue, null] as const }
  })))
  if (signal.aborted) return
  const queue = [...groups.values()]
  let cursor = 0
  const worker = async () => {
    while (!signal.aborted) {
      const group = queue[cursor++]
      if (!group) return
      const p = group[0]
      const data = catalogs.get(p.venue)
      const instrument = data?.instruments.find(i => i.id === p.instrumentId && i.quoteCurrency === p.quoteCurrency
        && i.marketId === (p.exchange === 'upbit' ? 'upbit' : 'binance-spot'))
      let result: ScanResult | null = null
      let issue: HoldingIssue | undefined = !data ? 'catalog' : !instrument ? 'missing' : undefined
      if (instrument) {
        try { result = await inspect(instrument, signal); if (!result) issue = 'analysis' }
        catch { issue = 'analysis' }
      }
      if (signal.aborted) return
      for (const position of group) onResult({ positionId: position.id, result, issue })
    }
  }
  await Promise.all([worker(), worker()])
}

export function currentHoldingResult(review: HoldingReview | undefined, now: number) {
  const r = review?.result
  return r && r.decision.direction !== 'unavailable' && now >= r.analyzedAt && now <= r.expiresAt ? r : null
}
