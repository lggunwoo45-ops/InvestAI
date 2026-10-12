import { beforeEach, describe, expect, it } from 'vitest'
import type { AnalysisChangeEvidence } from './analysisChangeEvidence'
import { compareAnalysisChanges } from './analysisChangeComparison'
import { itemFromInstrument, loadWatchlist, reviewItem, saveWatchlist, WATCHLIST_REVIEW_KEY, type ReviewSnapshot } from './watchlistStorage'

const evidence: AnalysisChangeEvidence = {
  instrumentId: 'upbit-test', market: 'upbit', exchange: 'upbit-krw', quoteCurrency: 'KRW', timeframe: '1H',
  source: 'live', stale: false, observedAt: '2026-10-12T00:00:00Z',
  technicalTrend: 'neutral', momentumState: 'neutral', volumeState: 'normal', dataQuality: 'live',
}
const snapshot: ReviewSnapshot = { finalReadState: 'keepWatching', finalReadTitle: 'Keep watching', finalReadSummary: 'Observe', capturedAt: '2026-10-12T00:00:00Z', currentPrice: 100, analysisEvidence: evidence }
const compare = (changes: Partial<AnalysisChangeEvidence>, previous = snapshot) => compareAnalysisChanges(previous, { ...snapshot, analysisEvidence: { ...evidence, ...changes } })
const statuses = (result: ReturnType<typeof compareAnalysisChanges>) => Object.fromEntries(result.differences.map(value => [value.dimension, value.status]))
const item = itemFromInstrument({ id: evidence.instrumentId, symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }, snapshot.capturedAt)

describe('analysis change comparison', () => {
  beforeEach(() => localStorage.clear())
  it('compares improved evidence without mutating either snapshot', () => {
    const before = JSON.stringify(snapshot)
    expect(statuses(compare({ technicalTrend: 'upward', momentumState: 'positive' }))).toMatchObject({ trend: 'improved', momentum: 'improved', price: 'unchanged' })
    expect(JSON.stringify(snapshot)).toBe(before)
  })
  it('compares weakened evidence and unchanged dimensions independently', () => {
    expect(statuses(compare({ technicalTrend: 'downward', momentumState: 'negative', volumeState: 'low' }))).toMatchObject({ trend: 'weakened', momentum: 'weakened', volume: 'weakened', finalRead: 'unchanged', quality: 'unchanged' })
    expect(compare({}).differences.every(value => value.status === 'unchanged')).toBe(true)
  })
  it('compares Final Read conservatively without ranking contextual review states', () => {
    expect(statuses(compareAnalysisChanges(snapshot, { ...snapshot, finalReadState: 'approachReviewPossible' })).finalRead).toBe('improved')
    expect(statuses(compareAnalysisChanges(snapshot, { ...snapshot, finalReadState: 'wait' })).finalRead).toBe('weakened')
    expect(statuses(compareAnalysisChanges(snapshot, { ...snapshot, finalReadState: 'holdingBasisReview' })).finalRead).toBe('unavailable')
  })
  it('does not fabricate old or current evidence', () => {
    for (const result of [compareAnalysisChanges(undefined, snapshot), compareAnalysisChanges({ ...snapshot, analysisEvidence: undefined }, snapshot), compareAnalysisChanges(snapshot, null), compareAnalysisChanges(snapshot, { ...snapshot, analysisEvidence: undefined })]) {
      expect(result.compatible).toBe(false)
      expect(result.differences.every(value => value.status === 'unavailable')).toBe(true)
    }
    expect(statuses(compare({ technicalTrend: undefined, momentumState: 'unavailable' }))).toMatchObject({ trend: 'unavailable', momentum: 'unavailable', volume: 'unchanged' })
  })
  it.each([
    { instrumentId: 'other' }, { market: 'binance-spot' }, { exchange: 'upbit-btc' },
    { quoteCurrency: 'USDT' }, { timeframe: '4H' as const }, { source: 'mock' as const },
  ])('rejects incompatible identity and series: %j', changes => {
    const result = compare(changes)
    expect(result.compatible).toBe(false)
    expect(result.differences.every(value => value.status === 'unavailable')).toBe(true)
  })
  it.each([{ stale: true }, { dataQuality: 'limited' as const }, { observedAt: undefined }])('limits current data rather than reporting improvement: %j', changes => {
    const result = compare({ technicalTrend: 'upward', ...changes })
    expect(result.limited).toBe(true)
    expect(statuses(result).trend).toBe('unavailable')
  })
  it('labels same-source mock comparisons as limited', () => {
    const mock = { ...snapshot, analysisEvidence: { ...evidence, source: 'mock' as const, dataQuality: 'mock' as const } }
    const result = compareAnalysisChanges(mock, { ...mock, analysisEvidence: { ...mock.analysisEvidence, technicalTrend: 'upward' } })
    expect(result.compatible).toBe(true)
    expect(result.limited).toBe(true)
    expect(statuses(result).trend).toBe('unavailable')
  })
  it('limits a stale observation even if the connection still reports live', () => {
    const current = { ...snapshot, capturedAt: '2026-10-12T02:00:00Z', analysisEvidence: { ...evidence, technicalTrend: 'upward' as const } }
    const result = compareAnalysisChanges(snapshot, current)
    expect(result.limited).toBe(true)
    expect(statuses(result).trend).toBe('unavailable')
  })
  it('compares actual data-quality recovery independently of technical evidence', () => {
    const limited = { ...snapshot, analysisEvidence: { ...evidence, dataQuality: 'limited' as const } }
    expect(statuses(compareAnalysisChanges(limited, snapshot)).quality).toBe('improved')
    expect(statuses(compareAnalysisChanges(snapshot, limited)).quality).toBe('weakened')
    expect(statuses(compareAnalysisChanges(limited, snapshot)).trend).toBe('unchanged')
  })
  it('never treats a higher price or elevated volume as improved quality', () => {
    const result = compareAnalysisChanges(snapshot, { ...snapshot, currentPrice: 150, analysisEvidence: { ...evidence, volumeState: 'elevated' } })
    expect(statuses(result)).toMatchObject({ price: 'unavailable', volume: 'unavailable', trend: 'unchanged', momentum: 'unchanged' })
    expect(result.differences.some(value => value.status === 'improved')).toBe(false)
    expect(result.differences.find(value => value.dimension === 'price')).toMatchObject({ previous: 100, current: 150 })
  })
  it('does not compare missing, non-finite or non-positive prices', () => {
    for (const currentPrice of [undefined, NaN, Infinity, 0, -1]) {
      expect(statuses(compareAnalysisChanges(snapshot, { ...snapshot, currentPrice })).price).toBe('unavailable')
    }
    expect(statuses(compareAnalysisChanges({ ...snapshot, currentPrice: undefined }, snapshot)).price).toBe('unavailable')
  })
  it('retains legacy storage and history without backfilling technical evidence', () => {
    const legacy = { ...snapshot, analysisEvidence: undefined }
    const stored = reviewItem([item], item.instrumentId, legacy)
    localStorage.setItem(WATCHLIST_REVIEW_KEY, JSON.stringify(stored))
    const loaded = loadWatchlist()[0]
    expect(loaded?.lastReviewedSnapshot).toEqual(legacy)
    expect(loaded?.reviewHistory?.[0]?.analysisEvidence).toBeUndefined()
    expect(compareAnalysisChanges(loaded?.lastReviewedSnapshot, snapshot).compatible).toBe(false)
  })
  it('persists optional evidence in the latest confirmed baseline and retained history', () => {
    let items = reviewItem([item], item.instrumentId, snapshot)
    const current = { ...snapshot, capturedAt: '2026-10-12T00:01:00Z', analysisEvidence: { ...evidence, technicalTrend: 'upward' as const } }
    expect(statuses(compareAnalysisChanges(items[0]?.lastReviewedSnapshot, current)).trend).toBe('improved')
    items = reviewItem(items, item.instrumentId, current)
    saveWatchlist(items)
    const loaded = loadWatchlist()[0]
    expect(loaded?.reviewHistory).toHaveLength(2)
    expect(loaded?.reviewHistory?.[1]?.analysisEvidence).toEqual(evidence)
    expect(loaded?.lastReviewedSnapshot?.analysisEvidence).toEqual(current.analysisEvidence)
    expect(statuses(compareAnalysisChanges(loaded?.lastReviewedSnapshot, current)).trend).toBe('unchanged')
  })
  it('preserves existing duplicate protection and ten-entry retention with evidence', () => {
    let items = reviewItem([item], item.instrumentId, snapshot)
    items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: '2026-10-12T00:00:01Z' })
    expect(items[0]?.reviewHistory).toHaveLength(1)
    for (let index = 1; index <= 12; index++) items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: new Date(Date.parse(snapshot.capturedAt) + index * 6000).toISOString() })
    expect(items[0]?.reviewHistory).toHaveLength(10)
  })
  it('drops malformed optional evidence without discarding a readable legacy item', () => {
    localStorage.setItem(WATCHLIST_REVIEW_KEY, JSON.stringify([{ ...item, lastReviewedSnapshot: { ...snapshot, analysisEvidence: { ...evidence, timeframe: 'bad', token: 'private' } } }]))
    const loaded = loadWatchlist()[0]
    expect(loaded?.lastReviewedSnapshot?.analysisEvidence).toBeUndefined()
    if (!loaded) throw new Error('Legacy item must remain readable')
    saveWatchlist([loaded])
    expect(localStorage.getItem(WATCHLIST_REVIEW_KEY)).not.toContain('private')
  })
  it('allowlists valid evidence fields on both snapshots and history', () => {
    localStorage.setItem(WATCHLIST_REVIEW_KEY, JSON.stringify([{ ...item,
      lastReviewedSnapshot: { ...snapshot, analysisEvidence: { ...evidence, token: 'private' } },
      reviewHistory: [{ ...snapshot, reviewedAt: snapshot.capturedAt, analysisEvidence: { ...evidence, token: 'private' } }],
    }]))
    const loaded = loadWatchlist()
    expect(loaded[0]?.lastReviewedSnapshot?.analysisEvidence).toEqual(evidence)
    expect(loaded[0]?.reviewHistory?.[0]?.analysisEvidence).toEqual(evidence)
    saveWatchlist(loaded)
    expect(localStorage.getItem(WATCHLIST_REVIEW_KEY)).not.toContain('private')
  })
})
