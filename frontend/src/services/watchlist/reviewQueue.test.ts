import { describe, expect, it } from 'vitest'
import { getReviewReasons, reviewReasonText } from './reviewQueue'
import { reviewItem, type ReviewSnapshot, type WatchlistItem } from './watchlistStorage'

const now = Date.parse('2026-10-10T00:00:00Z')
const item: WatchlistItem = { instrumentId: 'test', symbol: 'TEST', displayName: 'Test', marketType: 'upbit-krw', addedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() }
const snapshot: ReviewSnapshot = { finalReadState: 'wait', finalReadTitle: 'Wait', finalReadSummary: 'Observe', capturedAt: item.addedAt, priceChange24h: 0 }
const reviewed = reviewItem([item], item.instrumentId, snapshot)[0]!
describe('review queue rules', () => {
  it('requires first review and clears the queue when no other reason remains', () => {
    expect(getReviewReasons(item, { snapshot }, now)).toEqual(['first'])
    expect(reviewReasonText.ko.first).toBe('처음 확인 필요')
    expect(getReviewReasons(reviewed, { snapshot }, now)).toEqual([])
  })
  it.each([
    ['approachReviewPossible', 'approach'], ['changeCheckNeeded', 'change'], ['holdingBasisReview', 'holding'], ['extendedCaution', 'extended'],
  ] as const)('tracks changed and attention-worthy state %s', (state, reason) => {
    expect(getReviewReasons(reviewed, { snapshot: { ...snapshot, finalReadState: state } }, now)).toEqual(['changed', reason])
    expect(getReviewReasons(reviewItem([item], item.instrumentId, { ...snapshot, finalReadState: state })[0]!, { snapshot: { ...snapshot, finalReadState: state } }, now)).toEqual([reason])
  })
  it('recognizes improved data without inventing unavailable analysis', () => {
    const limited = reviewItem([item], item.instrumentId, { ...snapshot, finalReadState: 'notEnoughData', dataQuality: 'limited' })[0]!
    expect(getReviewReasons(limited, { snapshot }, now)).toContain('improved')
    expect(getReviewReasons(reviewed, {}, now)).toEqual(['limited'])
    expect(getReviewReasons(reviewed, { snapshot: { ...snapshot, dataQuality: 'limited' } }, now)).toContain('limited')
  })
  it.each([['upbit-krw', 5], ['binance-spot', -5], ['kospi', 3], ['nasdaq', -3]] as const)('checks inclusive price threshold for %s', (marketType, move) => {
    expect(getReviewReasons({ ...reviewed, marketType }, { snapshot, priceChange24h: Number(move) }, now)).toEqual(['price'])
    expect(getReviewReasons({ ...reviewed, marketType }, { snapshot, priceChange24h: Number(move) * .99 }, now)).toEqual([])
  })
  it('expires reviews only after 24 hours and ignores invalid movement', () => {
    expect(getReviewReasons(reviewed, { snapshot }, now + 86400000)).toEqual([])
    expect(getReviewReasons(reviewed, { snapshot }, now + 86400001)).toEqual(['stale'])
    expect(getReviewReasons(reviewed, { snapshot, priceChange24h: NaN }, now)).toEqual([])
  })
  it('keeps review labels free of prohibited guidance', () => {
    const forbidden = /매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i
    expect(JSON.stringify(reviewReasonText)).not.toMatch(forbidden)
  })
})
