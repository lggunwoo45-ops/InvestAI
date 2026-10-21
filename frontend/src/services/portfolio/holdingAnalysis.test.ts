import { describe, expect, it, vi } from 'vitest'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { Position } from './portfolioStorage'
import { analyzeHoldings, currentHoldingResult, type HoldingReview } from './holdingAnalysis'

const at = 1_800_000_000_000
const position = (id: string): Position => ({ id, instrumentId: id, symbol: id, venue: 'upbit-krw', exchange: 'upbit', quoteCurrency: 'KRW', quantity: 2, averagePrice: 100 })
const instrument = (p: Position): MarketInstrument => ({ id: p.instrumentId, symbol: p.symbol, name: p.symbol, marketId: p.exchange === 'upbit' ? 'upbit' : 'binance-spot', quoteCurrency: p.quoteCurrency, lastPrice: 120, volume24h: 100, change24hPercent: 2 })
const result = (i: MarketInstrument): ScanResult => ({ instrument: i, analyzedAt: at, expiresAt: at + 90_000, timedOut: false, decision: { direction: 'neutral', action: 'wait', coverage: 2, price: 120, frames: [], plan: null, extended: false, mixed: true } })
const catalogOf = (positions: Position[]): MarketCatalog => ({ venue: 'upbit-krw', source: 'live', fetchedAt: at, instruments: positions.map(instrument) })

describe('all saved holding analysis', () => {
  it('covers more than 12 holdings, shares duplicate lots, and excludes closed positions', async () => {
    const positions = Array.from({ length: 15 }, (_, i) => position(`coin-${i}`))
    const inspect = vi.fn(async (i: MarketInstrument) => result(i)), catalog = vi.fn(async () => catalogOf(positions))
    const reviews: HoldingReview[] = []
    await analyzeHoldings([...positions, { ...positions[0], id: 'another-lot' }, { ...position('closed'), quantity: 0 }], { signal: new AbortController().signal, inspect, catalog, now: () => at, onResult: r => reviews.push(r) })
    expect(inspect).toHaveBeenCalledTimes(15)
    expect(catalog).toHaveBeenCalledTimes(1)
    expect(reviews).toHaveLength(16)
    expect(reviews.find(r => r.positionId === 'another-lot')?.result).toBe(reviews[0].result)
    expect(reviews.some(r => r.positionId === 'closed')).toBe(false)
  })
  it('keeps unavailable venues, mismatched currencies and failed analysis visible, while continuing other assets', async () => {
    const positions = [position('missing'), position('throws'), position('good'), { ...position('btc-market'), venue: 'upbit-btc' as const, quoteCurrency: 'BTC' }]
    const catalog = vi.fn(async (venue: string) => {
      if (venue === 'upbit-btc') throw new Error('offline')
      const data = catalogOf(positions.slice(0, 3)); return { ...data, instruments: data.instruments.map(i => i.id === 'missing' ? { ...i, quoteCurrency: 'USDT' } : i) }
    })
    const reviews: HoldingReview[] = []
    await analyzeHoldings(positions, { signal: new AbortController().signal, catalog, inspect: async i => { if (i.id === 'throws') throw new Error('offline'); return result(i) }, now: () => at, onResult: r => reviews.push(r) })
    expect(reviews).toEqual(expect.arrayContaining([
      expect.objectContaining({ positionId: 'missing', issue: 'missing' }), expect.objectContaining({ positionId: 'throws', issue: 'analysis' }),
      expect.objectContaining({ positionId: 'btc-market', issue: 'catalog' }), expect.objectContaining({ positionId: 'good', result: expect.any(Object) }),
    ]))
  })
  it.each([{ source: 'mock' as const, fetchedAt: at }, { source: 'live' as const, fetchedAt: at - 60001 }, { source: 'live' as const, fetchedAt: at + 6000 }])('rejects a non-current live catalog %j', async override => {
    const inspect = vi.fn(), onResult = vi.fn()
    await analyzeHoldings([position('one')], { signal: new AbortController().signal, catalog: async () => ({ ...catalogOf([position('one')]), ...override }), inspect, now: () => at, onResult })
    expect(inspect).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledWith({ positionId: 'one', result: null, issue: 'catalog' })
  })
  it('limits concurrent inspections to two and discards late results after cancellation', async () => {
    const abort = new AbortController(), onResult = vi.fn(), pending: (() => void)[] = []
    const inspect = vi.fn((i: MarketInstrument) => new Promise<ScanResult>(resolve => pending.push(() => resolve(result(i)))))
    const positions = [position('1'), position('2'), position('3')]
    const task = analyzeHoldings(positions, { signal: abort.signal, catalog: async () => catalogOf(positions), inspect, now: () => at, onResult })
    await vi.waitFor(() => expect(inspect).toHaveBeenCalledTimes(2))
    abort.abort(); pending.forEach(finish => finish()); await task
    expect(inspect).toHaveBeenCalledTimes(2); expect(onResult).not.toHaveBeenCalled()
  })
  it('withdraws stale, future and unavailable decisions without extending their receipt lifetime', () => {
    const review = { positionId: '1', result: result(instrument(position('1'))) }
    expect(currentHoldingResult(review, at + 89999)).toBe(review.result)
    expect(currentHoldingResult(review, at + 90001)).toBeNull()
    expect(currentHoldingResult(review, at - 1)).toBeNull()
    expect(currentHoldingResult({ ...review, result: { ...review.result, decision: { ...review.result.decision, direction: 'unavailable' } } }, at)).toBeNull()
  })
})
