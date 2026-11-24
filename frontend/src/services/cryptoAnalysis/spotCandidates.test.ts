import { expect, it } from 'vitest'
import { opportunityNow as now, opportunityResult } from '@/test/opportunityFixtures'
import { futuresResult } from '@/test/futuresFixtures'
import { buildOpportunityPlans } from './opportunityEngine'
import { rankSpotCandidates } from './spotCandidates'
import type { ScanResult } from './liveCandidateScan'

function fallingSpot() {
  const row: ScanResult = futuresResult()
  row.instrument = { ...row.instrument, id: 'upbit-falling', symbol: 'FALL/KRW', marketId: 'upbit', quoteCurrency: 'KRW' }
  row.decision.frames.find(f => f.frame === '1H')!.volumeRatio = .4
  return row
}

it('keeps a healthy falling-market shortlist even when no strict entry or watch plan qualifies', () => {
  const rows = Array.from({ length: 12 }, (_, i) => {
    const row = fallingSpot(); row.instrument.id = `upbit-${i}`; return row
  })
  expect(rows.flatMap(r => buildOpportunityPlans(r.decision)).every(p => p.status === 'avoid')).toBe(true)
  const ranked = rankSpotCandidates(rows, now)
  expect(ranked).toHaveLength(12)
  expect(ranked.every(c => c.phase === 'avoid' && c.countertrend)).toBe(true)
  expect(ranked.every(c => c.reason === 'turnaround' && Number.isFinite(c.score))).toBe(true)
})

it('separates real readiness, price arrival and pending confirmation without loosening entry checks', () => {
  const row = opportunityResult()
  expect(rankSpotCandidates([row], now)[0].phase).toBe('ready')
  row.decision.frames.find(f => f.frame === '1H')!.volumeRatio = 1
  const pending = rankSpotCandidates([row], now)[0]
  expect(pending.phase).toBe('confirm-wait')
  expect(pending.reason).toBe('rebound')
  row.decision.price = pending.plan.entry![0] - .01
  expect(rankSpotCandidates([row], now)[0].phase).toBe('price-wait')
})

it('prioritizes observed recovery over continuing decline before full entry confirmation', () => {
  const rebound = opportunityResult(), falling = fallingSpot()
  rebound.decision.frames.find(f => f.frame === '1H')!.volumeRatio = .4
  const ranked = rankSpotCandidates([falling, rebound], now)
  expect(ranked[0].result.instrument.id).toBe(rebound.instrument.id)
  expect(ranked[0].phase).not.toBe('ready')
  expect(ranked[0].reason).toBe('rebound')
})

it('describes a rising three-hour move with a falling last bar as a pullback, not absent upside evidence', () => {
  const row = opportunityResult(), hour = row.decision.frames.find(f => f.frame === '1H')!
  hour.candles.at(-1)!.close = hour.candles.at(-2)!.close - .1
  const candidate = rankSpotCandidates([row], now)[0]
  expect(candidate.change3h).toBeGreaterThan(0)
  expect(candidate.reason).toBe('pullback')
  expect(candidate.phase).not.toBe('ready')
})

it('uses an observed recovery reference when costs invalidate a price plan, without inventing targets', () => {
  const row = fallingSpot(), candidate = rankSpotCandidates([row], now, 3)[0]
  expect(candidate.hasPricePlan).toBe(false)
  expect(candidate.phase).toBe('avoid')
  const bars = row.decision.frames.find(f => f.frame === '1H')!.candles
  expect(candidate.reassessPrice).toBe(Math.max(...bars.slice(-4, -1).map(b => b.high)))
  expect(candidate.reassessConfirmed).toBe(bars.at(-1)!.close > candidate.reassessPrice)
})

it('keeps Upbit quote identity and never compares its returns to Binance BTC', () => {
  for (const quote of ['KRW', 'BTC', 'USDT']) {
    const row = fallingSpot()
    row.instrument.quoteCurrency = quote
    const benchmark = opportunityResult()
    benchmark.instrument = { ...benchmark.instrument, id: 'binance-btc', symbol: 'BTC/USDT', marketId: 'binance-spot', quoteCurrency: 'USDT' }
    const candidate = rankSpotCandidates([row, benchmark], now).find(c => c.result.instrument.id === row.instrument.id)!
    expect(candidate.result.instrument.quoteCurrency).toBe(quote)
    expect(candidate.relativeBitcoin).toBeNull()
  }
})

it('excludes futures, unsupported venues, stale, missing data and invalid costs', () => {
  const row = opportunityResult()
  expect(rankSpotCandidates([futuresResult()], now)).toEqual([])
  expect(rankSpotCandidates([{ ...row, instrument: { ...row.instrument, marketId: 'korea-stock' } }], now)).toEqual([])
  expect(rankSpotCandidates([row], now - 1)).toEqual([])
  expect(rankSpotCandidates([row], row.expiresAt + 1)).toEqual([])
  expect(rankSpotCandidates([row], now, NaN)).toEqual([])
  row.decision.frames.find(f => f.frame === '1H')!.issue = 'gaps'
  expect(rankSpotCandidates([row], now)).toEqual([])
})

it('puts a viable pending rebound before a stronger overheated observation', () => {
  const waiting = opportunityResult(), hot = opportunityResult()
  waiting.instrument.id = 'waiting'; hot.instrument.id = 'hot'
  waiting.decision.frames.find(f => f.frame === '1H')!.volumeRatio = 1
  hot.decision.frames.find(f => f.frame === '1H')!.rsi = 80
  const ranked = rankSpotCandidates([hot, waiting], now)
  expect(ranked.map(c => c.result.instrument.id)).toEqual(['waiting','hot'])
  expect(ranked[0].verdict.action).toBe('volume')
  expect(ranked[1].verdict).toEqual({action:'excluded',exclusion:'heat'})
})
