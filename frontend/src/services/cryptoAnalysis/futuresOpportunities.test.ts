import { describe, expect, it } from 'vitest'
import { futuresResult } from '@/test/futuresFixtures'
import { opportunityNow as now, opportunityResult } from '@/test/opportunityFixtures'
import { buildOpportunityPlans } from './opportunityEngine'
import { futuresPlans, futuresShortlist, shortPayoff } from './futuresOpportunities'

const short = (row = futuresResult(), cost = .2) => futuresPlans(row, now, cost).find(p => p.kind === 'breakdown')!
describe('Binance USDT futures directions', () => {
  it('finds a confirmed short during a real closed-bar downtrend, with correctly ordered levels', () => {
    const row = futuresResult(), plan = short(row)
    expect(row.decision.direction).toBe('sell')
    expect(plan.status).toBe('ready')
    expect(plan.target).toBeLessThan(plan.entry![0])
    expect(plan.stop).toBeGreaterThan(plan.entry![1])
    expect(plan.checks.every(c => c.passed)).toBe(true)
    expect(plan.potentialReturnPercent).toBeGreaterThan(0)
  })
  it('charges costs on both short outcomes without leverage', () => {
    expect(shortPayoff(100, 104, 90, 1)).toEqual({ netRewardRisk:1.8, potentialReturnPercent:9, plannedLossPercent:5 })
    expect(shortPayoff(100, 90, 104, 1)).toBeNull()
    expect(shortPayoff(100, 104, 90, NaN)).toBeNull()
    expect(shortPayoff(100, 104, 90, -1)).toBeNull()
  })
  it('also evaluates bearish rejection at observed resistance', () => {
    const row = futuresResult(), hour = row.decision.frames.find(f => f.frame === '1H')!
    hour.sma20 = 100
    row.decision.price = 100.05
    hour.candles.at(-1)!.close = 100.05
    hour.candles.at(-1)!.open = 100.2
    hour.candles.at(-2)!.close = 100.1
    const rejection = futuresPlans(row, now).find(p => p.kind === 'rejection')!
    expect(rejection.status).toBe('ready')
    expect(rejection.target).toBe(92)
    expect(rejection.stop).toBeGreaterThan(100.05)
  })
  it('preserves existing long calculations while refusing spot, KRW, future or expired snapshots', () => {
    const row = futuresResult()
    expect(futuresPlans(opportunityResult(), now)).toEqual([])
    expect(futuresPlans({ ...row, instrument:{ ...row.instrument, marketId:'binance-spot' } }, now)).toEqual([])
    expect(futuresPlans({ ...row, instrument:{ ...row.instrument, quoteCurrency:'KRW' } }, now)).toEqual([])
    expect(futuresPlans(row, row.expiresAt + 1)).toEqual([])
    expect(futuresPlans(row, row.analyzedAt - 1)).toEqual([])
    const long = futuresPlans(row, now).filter(p => p.side === 'long')
    buildOpportunityPlans(row.decision).forEach((p, i) => expect(long[i]).toMatchObject({ status:p.status, entry:p.entry, stop:p.stop, target:p.target, potentialReturnPercent:p.netUpsidePercent }))
  })
  it('keeps an unconfirmed close or price arrival pending and uses the lower conditional short entry', () => {
    const row = futuresResult(), plan = short(row)
    row.decision.price = plan.entry![1] + .05
    const waiting = short(row)
    expect(waiting.status).toBe('watch')
    expect(waiting.referencePrice).toBe(waiting.entry![0])
    expect(waiting.priceBasis).toBe('conditional')
    const hour = row.decision.frames.find(f => f.frame === '1H')!
    hour.candles.at(-1)!.open = hour.candles.at(-1)!.close - .1
    row.decision.price = plan.referencePrice
    expect(short(row).status).toBe('watch')
    expect(short(row).checks.find(c => c.key === 'close')?.passed).toBe(false)
  })
  it('does not invent targets or recommend oversold and structurally losing shorts', () => {
    const row = futuresResult(), hour = row.decision.frames.find(f => f.frame === '1H')!
    hour.rsi = 20
    expect(short(row).status).toBe('avoid')
    hour.rsi = 50
    hour.candles[25].low = 99
    expect(short(row).target).toBeNull()
    expect(short(row).status).toBe('avoid')
    expect(short(futuresResult(), 3).status).toBe('avoid')
  })
  it('does not apply long-side selling cautions to shorts, but checks opposing buying flow', () => {
    const row = futuresResult()
    row.decision.context = { flow:'sell', cautions:['selling','altWeakness'], flowSample:{direction:'sell', ratio:0, count:10, largeCount:3, buy:0, sell:10, from:now-1000, to:now, threshold:1}, flowStale:false, flowLastAt:now, validUntil:now+60_000, dominanceDelta:.2 }
    expect(short(row).status).toBe('ready')
    row.decision.context.flow = 'buy'
    expect(short(row).status).toBe('watch')
    expect(short(row).checks.find(c => c.key === 'context')?.passed).toBe(false)
  })
  it('never treats insufficient data or bad cost input as an opportunity', () => {
    const row = futuresResult()
    row.decision.frames.find(f => f.frame === '1H')!.issue = 'stale'
    expect(short(row).status).toBe('unavailable')
    expect(short(futuresResult(), NaN).issue).toBe('cost')
    expect(futuresShortlist([futuresResult(), opportunityResult()], now, 'short')).toHaveLength(1)
    expect(futuresShortlist([futuresResult()], now, 'short')[0].plan.kind).toBe('breakdown')
  })
})
