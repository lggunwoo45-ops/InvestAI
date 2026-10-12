import { beforeEach, describe, expect, it } from 'vitest'
import { addItem, itemFromInstrument, loadWatchlist, removeItem, reviewItem, saveWatchlist, toggleItem, WATCHLIST_REVIEW_KEY, type ReviewSnapshot } from './watchlistStorage'

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
})
