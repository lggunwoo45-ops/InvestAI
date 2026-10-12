import { beforeEach, describe, expect, it } from 'vitest'
import { addItem, itemFromInstrument, loadWatchlist, removeItem, reviewItem, saveWatchlist, toggleItem, updateReviewJournal, WATCHLIST_REVIEW_KEY, type ReviewSnapshot } from './watchlistStorage'

const item = itemFromInstrument({ id: 'upbit-test', symbol: 'TEST/KRW', name: 'Test', marketId: 'upbit', marketType: 'upbit-krw', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 1 }, '2026-10-10T00:00:00Z')
const snapshot: ReviewSnapshot = { finalReadState: 'wait', finalReadTitle: 'Wait', finalReadSummary: 'Observe', capturedAt: '2026-10-10T01:00:00Z', currentPrice: 100 }
describe('watchlist local storage', () => {
  beforeEach(() => localStorage.clear())
  it('returns empty storage and rejects malformed or future-shaped data safely', () => {
    expect(loadWatchlist()).toEqual([])
    for (const value of ['{', 'null', '{}', '42', '[null]', '[{"instrumentId":42}]', JSON.stringify([{ ...item, addedAt: 'invalid' }]), JSON.stringify([{ ...item, lastReviewedSnapshot: { ...snapshot, finalReadState: 'unknown' } }])]) {
      localStorage.setItem(WATCHLIST_REVIEW_KEY, value)
      expect(loadWatchlist()).toEqual([])
    }
  })
  it('adds, deduplicates, removes, toggles and persists identities', () => {
    expect(addItem([item], item)).toEqual([item])
    saveWatchlist(addItem([], item))
    expect(loadWatchlist()).toEqual([item])
    saveWatchlist(removeItem(loadWatchlist(), item.instrumentId))
    expect(loadWatchlist()).toEqual([])
    expect(toggleItem(toggleItem([], item), item)).toEqual([])
  })
  it('persists reviewed timestamps and snapshots using a field allowlist', () => {
    const reviewed = reviewItem([item], item.instrumentId, snapshot)
    saveWatchlist([{ ...reviewed[0]!, apiKey: 'secret-value', credentials: 'secret-value', lastReviewedSnapshot: { ...snapshot, token: 'secret-value' } } as typeof item])
    expect(loadWatchlist()[0]?.lastReviewedSnapshot).toEqual(snapshot)
    expect(loadWatchlist()[0]?.lastReviewedAt).toBe(snapshot.capturedAt)
    expect(loadWatchlist()[0]?.updatedAt).toBe(snapshot.capturedAt)
    expect(localStorage.getItem(WATCHLIST_REVIEW_KEY)).not.toContain('secret-value')
  })
  it('preserves old items and normalizes malformed optional journal fields', () => {
    saveWatchlist([item])
    expect(loadWatchlist()).toEqual([item])
    localStorage.setItem(WATCHLIST_REVIEW_KEY, JSON.stringify([{ ...item, note: { apiKey: 'private-value' }, reviewReason: 42, reviewHistory: [null, { reviewedAt: 'invalid' }] }]))
    expect(loadWatchlist()[0]).toMatchObject({ instrumentId: item.instrumentId, reviewHistory: [] })
    expect(loadWatchlist()[0]?.note).toBeUndefined()
  })
  it('saves and clears notes and watch reasons without adding review history', () => {
    const updated = updateReviewJournal([item], item.instrumentId, 'Observe data quality', 'Follow evidence changes', snapshot.capturedAt)
    saveWatchlist(updated)
    expect(loadWatchlist()[0]).toMatchObject({ note: 'Observe data quality', reviewReason: 'Follow evidence changes', updatedAt: snapshot.capturedAt })
    expect(loadWatchlist()[0]?.lastReviewedAt).toBeUndefined()
    expect(loadWatchlist()[0]?.reviewHistory).toBeUndefined()
    saveWatchlist(updateReviewJournal(updated, item.instrumentId, '', ''))
    expect(loadWatchlist()[0]?.note).toBeUndefined()
    expect(loadWatchlist()[0]?.reviewReason).toBeUndefined()
  })
  it('appends current evidence and the saved note with a primary review reason', () => {
    const noted = updateReviewJournal([item], item.instrumentId, 'Check volume', 'Observe context')
    saveWatchlist(reviewItem(noted, item.instrumentId, snapshot))
    expect(loadWatchlist()[0]?.reviewHistory).toEqual([{ reviewedAt: snapshot.capturedAt, finalReadState: snapshot.finalReadState, finalReadTitle: snapshot.finalReadTitle, finalReadSummary: snapshot.finalReadSummary, currentPrice: snapshot.currentPrice, primaryReviewReason: 'first', note: 'Check volume' }])
  })
  it('deduplicates identical content within five seconds but keeps changed notes and later reviews', () => {
    let items = reviewItem([item], item.instrumentId, snapshot)
    const at = (offset: number) => new Date(Date.parse(snapshot.capturedAt) + offset).toISOString()
    items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: at(5000), currentPrice: 101 })
    expect(items[0]?.reviewHistory).toHaveLength(1)
    expect(items[0]?.lastReviewedAt).toBe(at(5000))
    items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: at(5001) })
    expect(items[0]?.reviewHistory).toHaveLength(2)
    items = updateReviewJournal(items, item.instrumentId, 'New observation', '')
    items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: at(5002) })
    expect(items[0]?.reviewHistory).toHaveLength(3)
  })
  it('keeps ten most recent entries and excludes new credential payloads', () => {
    let items = [item]
    for (let index = 0; index < 12; index++) items = reviewItem(items, item.instrumentId, { ...snapshot, capturedAt: new Date(Date.parse(snapshot.capturedAt) + index * 6000).toISOString() })
    expect(items[0]?.reviewHistory).toHaveLength(10)
    expect(items[0]?.reviewHistory?.[0]?.reviewedAt).toBe(new Date(Date.parse(snapshot.capturedAt) + 66000).toISOString())
    saveWatchlist(updateReviewJournal(items, item.instrumentId, 'apiKey=private-value', 'password: private-value'))
    expect(localStorage.getItem(WATCHLIST_REVIEW_KEY)).not.toContain('private-value')
  })
})
