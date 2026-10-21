import { describe, expect, it } from 'vitest'
import { calculatePurchasePlan, runDailyBacktest } from './strategyLab'
const day = 86_400_000, now = 20000 * day
const bars = Array.from({ length: 120 }, (_, i) => {
  const price = i < 75 ? 100 + i : 175 - (i - 75) * 3
  return { timestamp: now - (120 - i) * day, open: price, close: price, high: price + 1, low: price - 1, volume: 10 }
})
describe('purchase planning', () => {
  it('includes fees on entry and either exit', () => {
    const result = calculatePurchasePlan({ entry: 100, quantity: 2, stop: 90, target: 120, feePercent: 1 })
    expect(result.cost).toBe(202); expect(result.loss).toBeCloseTo(23.8); expect(result.gain).toBeCloseTo(35.6)
    expect(result.rewardRisk).toBeCloseTo(35.6 / 23.8)
  })
  it('rejects inverted prices and nonfinite/overflow input', () => {
    for (const entry of [0, -1, Infinity, NaN, 130]) expect(() => calculatePurchasePlan({ entry, quantity: 2, stop: 90, target: 120, feePercent: 1 })).toThrow()
    expect(() => calculatePurchasePlan({ entry: 1e300, quantity: 1e300, stop: 1e299, target: 1e301, feePercent: 1 })).toThrow()
  })
})
describe('bounded historical test', () => {
  it('fills at the next open after the first 50 closed bars and reports the exact window', () => {
    const result = runDailyBacktest(bars, now, 1000, 0, 0)
    expect(result.trades[0]).toMatchObject({ entryAt: bars[50].timestamp, entry: bars[50].open })
    expect(result.from).toBe(bars[50].timestamp); expect(result.to).toBe(now)
    expect(result.buyHoldPercent).toBeCloseTo((bars.at(-1)!.close / bars[50].open - 1) * 100)
    expect(result.equity).toBeCloseTo(1000 + result.trades.reduce((sum, trade) => sum + trade.pnl, 0))
  })
  it('charges both fees and slippage and tracks drawdown', () => {
    const free = runDailyBacktest(bars, now, 1000, 0, 0), cost = runDailyBacktest(bars, now, 1000, 1, 1)
    expect(cost.equity).toBeLessThan(free.equity); expect(cost.drawdownPercent).toBeGreaterThan(0)
  })
  it('excludes unfinished bars and has no hindsight on earlier trades', () => {
    const initial = runDailyBacktest(bars, now, 1000, .05)
    const tail = [...bars, { ...bars[0], timestamp: now, close: 1e10, high: 1e10 }]
    expect(runDailyBacktest(tail, now, 1000, .05)).toEqual(initial)
    const changed = bars.map((c, i) => i > 110 ? { ...c, open: 500, close: 500, high: 501, low: 499 } : c)
    expect(runDailyBacktest(changed, now, 1000, .05).trades[0]).toEqual(initial.trades[0])
  })
  it('rejects gaps, duplicates, invalid candles, short history and invalid costs', () => {
    for (const rows of [bars.slice(0, 70), bars.filter((_, i) => i !== 30), [...bars.slice(0, 60), ...bars.slice(59)], bars.map((c, i) => i === 20 ? { ...c, close: NaN } : c)]) expect(() => runDailyBacktest(rows, now, 1000, .05)).toThrow()
    expect(() => runDailyBacktest(bars, now, 1000, -1)).toThrow()
  })
})
