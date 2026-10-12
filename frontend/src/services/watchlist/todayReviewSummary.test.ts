import { describe, expect, it } from 'vitest'
import { buildTodayReviewSummary } from './todayReviewSummary'
import type { CurrentReviewData } from './reviewQueue'
import type { ReviewSnapshot, WatchlistItem } from './watchlistStorage'

const now = Date.parse('2026-10-11T12:00:00Z')
const snapshot = (state: ReviewSnapshot['finalReadState']): ReviewSnapshot => ({ finalReadState: state, finalReadTitle: state, finalReadSummary: 'Review evidence', capturedAt: new Date(now).toISOString(), dataQuality: 'available' })
const item = (id: string, previous?: ReviewSnapshot): WatchlistItem => ({ instrumentId: id, symbol: id, displayName: id, marketType: 'upbit-krw', addedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), lastReviewedSnapshot: previous, lastReviewedAt: previous?.capturedAt })

describe('today review summary', () => {
  it('counts saved identities, queue membership, changes, states and recovered data', () => {
    const items = [item('changed', snapshot('keepWatching')), item('approach', snapshot('approachReviewPossible')), item('extended', snapshot('extendedCaution')), item('recovered', snapshot('notEnoughData')), item('quiet', snapshot('wait'))]
    const current = new Map<string, CurrentReviewData>([
      ['changed', { snapshot: snapshot('wait') }], ['approach', { snapshot: snapshot('approachReviewPossible') }], ['extended', { snapshot: snapshot('extendedCaution') }], ['recovered', { snapshot: snapshot('keepWatching') }], ['quiet', { snapshot: snapshot('wait') }],
    ])
    expect(buildTodayReviewSummary(items, current, now).summary).toEqual({ watchlistCount: 5, reviewQueueCount: 4, changedCount: 2, approachReviewCount: 1, extendedCount: 1, dataRecoveredCount: 1, staleCount: 0, lastUpdatedAt: new Date(now).toISOString() })
  })
  it('handles empty watchlists and missing evidence without reusing saved analysis as current', () => {
    expect(buildTodayReviewSummary([], new Map(), now).summary).toEqual({ watchlistCount: 0, reviewQueueCount: 0, changedCount: 0, approachReviewCount: 0, extendedCount: 0, dataRecoveredCount: 0, staleCount: 0 })
    const result = buildTodayReviewSummary([item('missing', snapshot('approachReviewPossible'))], new Map(), now)
    expect(result.summary).toMatchObject({ watchlistCount: 1, reviewQueueCount: 1, approachReviewCount: 0, extendedCount: 0, changedCount: 0, dataRecoveredCount: 0 })
    expect(result.summary.lastUpdatedAt).toBeUndefined()
    expect(result.queue[0]?.reasons).toEqual(['limited'])
  })
  it('counts stale reviews once per instrument and clears reasons after confirmation', () => {
    const stale = { ...item('one', snapshot('wait')), lastReviewedAt: new Date(now - 86400001).toISOString() }
    const current = new Map([['one', { snapshot: snapshot('wait') }]])
    expect(buildTodayReviewSummary([stale, stale], current, now).summary).toMatchObject({ watchlistCount: 1, reviewQueueCount: 1, staleCount: 1 })
    expect(buildTodayReviewSummary([{ ...stale, lastReviewedAt: new Date(now).toISOString() }], current, now).summary).toMatchObject({ watchlistCount: 1, reviewQueueCount: 0, staleCount: 0 })
  })
  it('does not contain prohibited guidance in generated summaries', () => {
    expect(JSON.stringify(buildTodayReviewSummary([item('TEST')], new Map(), now))).not.toMatch(/매수|매도|매수가|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
})
