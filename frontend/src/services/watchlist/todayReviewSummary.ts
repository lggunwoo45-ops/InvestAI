import { getReviewReasons, type CurrentReviewData, type ReviewReason } from './reviewQueue'
import type { WatchlistItem } from './watchlistStorage'

export interface TodayReviewSummary {
  watchlistCount: number
  reviewQueueCount: number
  changedCount: number
  approachReviewCount: number
  extendedCount: number
  dataRecoveredCount: number
  staleCount: number
  lastUpdatedAt?: string
}
export interface TodayReviewEntry {
  item: WatchlistItem
  current: CurrentReviewData
  reasons: readonly ReviewReason[]
}
export interface TodayReviewModel {
  summary: TodayReviewSummary
  queue: readonly TodayReviewEntry[]
}

/** Current evidence only. Reviewed snapshots remain comparison baselines. No I/O. */
export function buildTodayReviewSummary(
  items: readonly WatchlistItem[],
  currentById: ReadonlyMap<string, CurrentReviewData> = new Map(),
  now = Date.now(),
): TodayReviewModel {
  const uniqueItems = [...new Map(items.map(item => [item.instrumentId, item])).values()]
  const entries = uniqueItems.map(item => {
    const current = currentById.get(item.instrumentId) ?? {}
    return { item, current, reasons: getReviewReasons(item, current, now) }
  })
  const countReason = (reason: ReviewReason) => entries.filter(entry => entry.reasons.includes(reason)).length
  const queue = entries.filter(entry => entry.reasons.length > 0)
  const observedTimes = entries.map(entry => entry.current.snapshot?.capturedAt).filter((time): time is string => !!time && Number.isFinite(Date.parse(time)))
  observedTimes.sort((a, b) => Date.parse(b) - Date.parse(a))
  return {
    summary: {
      watchlistCount: entries.length,
      reviewQueueCount: queue.length,
      changedCount: countReason('changed'),
      approachReviewCount: entries.filter(entry => entry.current.snapshot?.finalReadState === 'approachReviewPossible').length,
      extendedCount: entries.filter(entry => entry.current.snapshot?.finalReadState === 'extendedCaution').length,
      dataRecoveredCount: countReason('improved'),
      staleCount: countReason('stale'),
      ...(observedTimes[0] ? { lastUpdatedAt: observedTimes[0] } : {}),
    },
    queue,
  }
}
