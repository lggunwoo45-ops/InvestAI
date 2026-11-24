import { expect, it } from 'vitest'
import { futuresResult } from '@/test/futuresFixtures'
import { opportunityNow as now, opportunityResult } from '@/test/opportunityFixtures'
import { futuresPlans } from './futuresOpportunities'
import { rankFuturesCandidates } from './futuresCandidates'

function unconfirmed() {
  const row = futuresResult()
  row.decision.frames.find(f => f.frame === '1H')!.volumeRatio = .4
  return row
}
it('ranks both directions even when no plan qualifies for immediate entry', () => {
  const rows = Array.from({length:12}, (_,i) => { const row = unconfirmed(); row.instrument.id = `binance-${i}`; return row })
  expect(rows.flatMap(r => futuresPlans(r, now)).some(p => p.status === 'ready')).toBe(false)
  for (const side of ['long','short'] as const) {
    const ranked = rankFuturesCandidates(rows, now, side)
    expect(ranked).toHaveLength(12)
    expect(ranked.slice(0,3).every(c => c.phase !== 'ready')).toBe(true)
    expect(ranked.every(c => Number.isFinite(c.score) && c.reassessPrice > 0)).toBe(true)
  }
})
it('separates current entry readiness, price waiting and missing confirmation', () => {
  const row = futuresResult()
  expect(rankFuturesCandidates([row], now, 'short')[0].phase).toBe('ready')
  const plan = futuresPlans(row, now).find(p => p.kind === 'breakdown')!
  row.decision.price = plan.entry![1] + .05
  expect(rankFuturesCandidates([row], now, 'short')[0].phase).toBe('price-wait')
  row.decision.price = plan.referencePrice
  row.decision.frames.find(f => f.frame === '1H')!.volumeRatio = .4
  expect(rankFuturesCandidates([row], now, 'short')[0].phase).toBe('confirm-wait')
})
it('ranks actual upward and downward tapes differently instead of copying one list to both sides', () => {
  const down = unconfirmed(), up = opportunityResult(false)
  up.instrument = {...up.instrument, id:'binance-up', marketId:'binance-futures', quoteCurrency:'USDT', symbol:'UPUSDT'}
  up.decision.frames.find(f => f.frame === '1H')!.volumeRatio = .4
  expect(rankFuturesCandidates([down,up], now, 'long')[0].result.instrument.id).toBe('binance-up')
  expect(rankFuturesCandidates([up,down], now, 'short')[0].result.instrument.id).toBe(down.instrument.id)
})
it('never upgrades oversold or missing-target observations into entry-ready candidates', () => {
  const row = unconfirmed(), hour = row.decision.frames.find(f => f.frame === '1H')!
  hour.rsi = 20
  expect(rankFuturesCandidates([row], now, 'short')[0].phase).toBe('avoid')
  hour.candles[25].low = 99
  const candidate = rankFuturesCandidates([row], now, 'short')[0]
  expect(candidate.hasPricePlan).toBe(false)
  expect(candidate.reassessPrice).toBe(Math.min(...hour.candles.slice(-4,-1).map(c=>c.low)))
  expect(candidate.plan.target).toBeNull()
})
it('marks countertrend observations explicitly and retains full confirmation requirements', () => {
  const row = unconfirmed()
  row.decision.frames.find(f => f.frame === '4H')!.direction = 'buy'
  const candidate = rankFuturesCandidates([row], now, 'short')[0]
  expect(candidate.countertrend).toBe(true)
  expect(candidate.phase).toBe('avoid')
})
it('excludes a remote entry zone even after its short-term reference was already crossed', () => {
  const row = unconfirmed(), hour = row.decision.frames.find(f=>f.frame==='1H')!
  const plan = futuresPlans(row,now).find(p=>p.kind==='breakdown')!
  row.decision.price = plan.entry![0] - hour.atr! * 4
  const candidate = rankFuturesCandidates([row],now,'short')[0]
  expect(candidate.planDistant).toBe(true)
  expect(candidate.hasPricePlan).toBe(false)
  expect(candidate.phase).toBe('avoid')
  expect(candidate.reassessConfirmed).toBe(true)
})
it('excludes stale, insufficient and wrong-venue data even in active discovery', () => {
  const row = unconfirmed()
  expect(rankFuturesCandidates([row], row.expiresAt+1, 'short')).toEqual([])
  expect(rankFuturesCandidates([row], now-1, 'short')).toEqual([])
  expect(rankFuturesCandidates([row], now, 'short', NaN)).toEqual([])
  expect(rankFuturesCandidates([opportunityResult()], now, 'long')).toEqual([])
  expect(rankFuturesCandidates([{...row,instrument:{...row.instrument,quoteCurrency:'KRW'}}], now, 'short')).toEqual([])
  row.decision.frames.find(f=>f.frame==='1H')!.issue='gaps'
  expect(rankFuturesCandidates([row], now, 'short')).toEqual([])
})

 it('ranks a viable waiting short before a stronger but excluded short', () => {
  const waiting = unconfirmed(), excluded = unconfirmed()
  waiting.instrument.id = 'waiting'; excluded.instrument.id = 'excluded'
  excluded.decision.frames.find(f => f.frame === '1H')!.rsi = 20
  const ranked = rankFuturesCandidates([excluded, waiting], now, 'short')
  expect(ranked[0]).toMatchObject({ result:{instrument:{id:'waiting'}}, verdict:{action:'volume'} })
  expect(ranked[1]).toMatchObject({ result:{instrument:{id:'excluded'}}, verdict:{action:'excluded',exclusion:'heat'} })
})
