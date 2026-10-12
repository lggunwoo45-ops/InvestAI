import type { ReviewSnapshot } from './watchlistStorage'
import { timeframeMilliseconds } from '@/services/market/providers/providerUtils'

export type AnalysisChange = 'improved' | 'weakened' | 'unchanged' | 'unavailable'
export type AnalysisDimension = 'finalRead' | 'trend' | 'momentum' | 'volume' | 'price' | 'quality'
export interface EvidenceDifference {
  dimension: AnalysisDimension
  previous?: string | number
  current?: string | number
  status: AnalysisChange
}

// Context-dependent states (extension, holding review, strong momentum and elevated
// volume) deliberately have no quality ordering. These are not investment scores.
const constructiveTransitions: Record<AnalysisDimension, readonly string[]> = {
  finalRead: ['wait:keepWatching', 'wait:approachReviewPossible', 'keepWatching:approachReviewPossible'],
  trend: ['downward:neutral', 'downward:upward', 'neutral:upward'],
  momentum: ['strongNegative:negative', 'strongNegative:neutral', 'strongNegative:positive', 'negative:neutral', 'negative:positive', 'neutral:positive'],
  volume: ['low:normal'],
  price: [],
  quality: ['limited:live'],
}
const available = (value: unknown): value is string | number => value !== undefined && value !== null && value !== 'unavailable' && (typeof value !== 'number' || Number.isFinite(value))

function freshObservation(snapshot: ReviewSnapshot | null | undefined): boolean {
  const evidence = snapshot?.analysisEvidence
  if (!snapshot || !evidence?.observedAt || evidence.stale || evidence.source !== 'live') return false
  const age = Date.parse(snapshot.capturedAt) - Date.parse(evidence.observedAt)
  // Comparison-only freshness: an observation older than its chart interval is
  // limited. Historical freshness is evaluated at confirmation, not against now.
  return Number.isFinite(age) && age >= 0 && age <= timeframeMilliseconds[evidence.timeframe]
}

/** Pure comparison: time is supplied by the caller, with no clock, storage or I/O. */
export function compareAnalysisChanges(previous: ReviewSnapshot | undefined, current: ReviewSnapshot | null) {
  const old = previous?.analysisEvidence
  const next = current?.analysisEvidence
  const compatible = Boolean(old && next &&
    (['instrumentId', 'market', 'exchange', 'quoteCurrency', 'timeframe', 'source'] as const).every(key => old[key] === next[key]))
  const qualityComparable = freshObservation(previous) && freshObservation(current)
  const limited = Boolean(next && (!freshObservation(current) || next.dataQuality !== 'live')
    || old && (!freshObservation(previous) || old.dataQuality !== 'live'))
  const values: [AnalysisDimension, string | number | undefined, string | number | undefined][] = [
    ['finalRead', previous?.finalReadState, current?.finalReadState],
    ['trend', old?.technicalTrend, next?.technicalTrend],
    ['momentum', old?.momentumState, next?.momentumState],
    ['volume', old?.volumeState, next?.volumeState],
    ['price', previous?.currentPrice, current?.currentPrice],
    ['quality', old?.dataQuality, next?.dataQuality],
  ]
  const differences: EvidenceDifference[] = values.map(([dimension, before, after]) => {
    let status: AnalysisChange = 'unavailable'
    if (compatible && available(before) && available(after)
      && (dimension !== 'price' || (typeof before === 'number' && before > 0 && typeof after === 'number' && after > 0))) {
      if (before === after) status = 'unchanged'
      else if (!limited || (dimension === 'quality' && qualityComparable)) {
        if (constructiveTransitions[dimension].includes(`${before}:${after}`)) status = 'improved'
        else if (constructiveTransitions[dimension].includes(`${after}:${before}`)) status = 'weakened'
      }
    }
    return { dimension, previous: before, current: after, status }
  })
  return { compatible, limited, differences, comparedAt: current?.capturedAt, previousAt: previous?.capturedAt }
}
