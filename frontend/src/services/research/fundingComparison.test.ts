import { describe, expect, it } from 'vitest'
import { fundingComparison } from './fundingComparison'
import { feeBudget, observedFundingInterval, type ResearchSnapshot } from './researchModel'
describe('exchange-normalized funding and trading costs', () => {
  it('normalizes per-hour and per-eight-hour quotes without mixing units', () => {
    const now = 100_000
    const sources = {
      bybit: { status: 'available' as const, source: 'Bybit', receivedAt: now, data: { time: now, result: { list: [{ symbol: 'BTCUSDT', fundingRate: '.0008', fundingIntervalHour: '8', nextFundingTime: now + 1000 }] } } },
      hyperliquid: { status: 'available' as const, source: 'Hyperliquid', receivedAt: now, data: [{ universe: [{ name: 'BTC' }] }, [{ funding: '.0001' }]] },
    }
    const snapshot: ResearchSnapshot = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: now, sources }
    const rows = fundingComparison(snapshot, now)
    expect(rows).toHaveLength(2); expect(rows[0]!.annualPercent).toBeCloseTo(rows[1]!.annualPercent)
    expect(rows.find(r => r.exchange === 'Hyperliquid')?.quote).toBe('USDC')
    expect(fundingComparison(snapshot, now + 200_000)).toEqual([])
  })
  it('does not guess a funding interval when recent settlement gaps differ', () => {
    const snapshot: ResearchSnapshot = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: 1, sources: { fundingHistory: { status: 'available', source: 'Binance', receivedAt: 1, data: [1, 2, 3, 5].map(h => ({ fundingTime: h * 3_600_000 })) } } }
    expect(observedFundingInterval(snapshot, 2)).toBeNull()
  })
  it('calculates asymmetric payoff breakeven and maker/taker monthly cost', () => {
    const result = feeBudget({ notional: 1000, makerPercent: .02, takerPercent: .05, entryMaker: true, exitMaker: false, monthlyTrips: 20, targetPercent: 2, stopPercent: 1 })!
    expect(result.perTrip).toBeCloseTo(.7); expect(result.monthly).toBeCloseTo(14); expect(result.annual).toBeCloseTo(168)
    expect(result.breakevenPercent).toBeCloseTo(1.07 / 3 * 100)
  })
})
