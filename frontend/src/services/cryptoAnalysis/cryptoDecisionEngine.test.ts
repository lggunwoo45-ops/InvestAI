import { describe, expect, it } from 'vitest'
import { analysisIntervals, buildCryptoDecision, readFrame, tradeFlow, wilderRsi, type AnalysisFrame, type AnalysisSeries } from './cryptoDecisionEngine'
const now = Date.parse('2026-10-20T12:00:00Z')
export function fixture(frame: AnalysisFrame, trend = 1): AnalysisSeries {
  const interval = analysisIntervals[frame], end = Math.floor(now / interval) * interval
  return { dataQuality: 'live', connectionStatus: 'live', currentPrice: 200 + trend * 79, updatedAt: now, candles: Array.from({ length: 80 }, (_, i) => {
    const close = 200 + trend * i
    return { timestamp: end - (80 - i) * interval, open: close, close, high: close + 3, low: close - 3, volume: i === 79 ? 180 : 100 }
  }) }
}
const all = (trend = 1) => ({ '1H': fixture('1H', trend), '4H': fixture('4H', trend), '1D': fixture('1D', trend) })

describe('closed-bar crypto direction and price plans', () => {
  it('distinguishes initial loading from retries, even before history arrives', () => {
    const series = { ...fixture('1H'), dataQuality: 'unavailable' as const, candles: [] }
    expect(readFrame('1H', { ...series, connectionStatus: 'connecting' }, now).issue).toBe('loading')
    expect(readFrame('1H', { ...series, connectionStatus: 'reconnecting' }, now).issue).toBe('disconnected')
  })
  it('uses exchange time for closed bars but local receipt age for stale-feed rejection', () => {
    const series = { ...fixture('1H'), marketTime: now - 310_000 }
    const result = readFrame('1H', series, now)
    expect(result).toMatchObject({ issue: null, count: 79, asOf: now - 3_600_000 })
    expect(readFrame('1H', series, now + 91_000).issue).toBe('stale')
    expect(readFrame('1H', { ...series, marketTime: now + 310_000 }, now)).toMatchObject({ issue: null, count: 80, asOf: now })
  })
  it('reports a source gap without synthesizing bars, while healthy frames still produce a plan', () => {
    const hourly = fixture('1H')
    const gapped = { ...hourly, candles: hourly.candles.filter((_, i) => i < 65 || i > 68) }
    const result = buildCryptoDecision({ ...all(), '1H': gapped }, now)
    expect(result).toMatchObject({ direction: 'buy', coverage: 2 })
    expect(result.plan).not.toBeNull()
    expect(result.frames[0]).toMatchObject({ issue: 'gaps', candles: [], gap: { from: hourly.candles[65].timestamp, to: hourly.candles[69].timestamp, missing: 4 } })
    expect(gapped.candles).toHaveLength(76)
  })
  it('computes Wilder RSI from a known 14-change seed, including zero gain/loss cases', () => {
    expect(wilderRsi([44.34,44.09,44.15,43.61,44.33,44.83,45.1,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28])).toBeCloseTo(70.4641, 3)
    expect(wilderRsi(Array(20).fill(100))).toBe(50)
    expect(wilderRsi(Array.from({length:20}, (_, i) => 100 + i))).toBe(100)
    expect(wilderRsi(Array.from({length:20}, (_, i) => 100 - i))).toBe(0)
    expect(wilderRsi([1,2])).toBeNull()
  })
  it('reads moving averages, true-range volatility and relative CLOSED-bar volume', () => {
    const result = readFrame('4H', fixture('4H'), now)
    expect(result).toMatchObject({ issue: null, direction: 'buy', sma20: 269.5, sma50: 254.5, atr: 6, volumeRatio: 1.8 })
  })
  it('produces ordered entry/invalidation/resistance prices and transparent reward/risk', () => {
    const result = buildCryptoDecision(all(), now)
    expect(result).toMatchObject({ direction: 'buy', action: 'pullback', coverage: 3, extended: true })
    const plan = result.plan!
    expect(plan.stop).toBeLessThan(plan.entry[0])
    expect(plan.entry[0]).toBeLessThanOrEqual(plan.entry[1])
    expect(plan.entry[1]).toBeLessThanOrEqual(result.price!)
    expect(plan.resistance[0]).toBeGreaterThan(plan.entry[1])
    expect(plan.sellInvalidation).toBeGreaterThan(plan.resistance[1])
    expect(plan.rewardRisk).toBeCloseTo((plan.target - (plan.entry[0] + plan.entry[1]) / 2) / ((plan.entry[0] + plan.entry[1]) / 2 - plan.stop))
  })
  it('gives sell-side and sideways results without reversing oversold/overbought into predictions', () => {
    expect(buildCryptoDecision(all(-1), now)).toMatchObject({ direction: 'sell', action: 'reduce' })
    expect(buildCryptoDecision(all(0), now)).toMatchObject({ direction: 'neutral', action: 'wait' })
  })
  it('weights conflicting timeframes and retains useful analysis when one timeframe fails', () => {
    expect(buildCryptoDecision({ ...all(), '1D': fixture('1D', -1) }, now)).toMatchObject({ direction: 'neutral', mixed: true })
    expect(buildCryptoDecision({ ...all(), '1D': { ...fixture('1D'), dataQuality: 'unavailable' } }, now)).toMatchObject({ direction: 'buy', coverage: 2 })
    const onlyOne = { ...all(), '1H': { ...fixture('1H'), candles: [] }, '1D': { ...fixture('1D'), candles: [] } }
    expect(buildCryptoDecision(onlyOne, now)).toMatchObject({ direction: 'unavailable', plan: null })
  })
  it('ignores unfinished bars, future bars and malformed bars without look-ahead', () => {
    const series = fixture('1H'), expected = readFrame('1H', series, now)
    const current = { timestamp: now, open: 9999, high: 10000, low: 1, close: 2, volume: 1e9 }
    expect(readFrame('1H', { ...series, candles: [...series.candles, current, { ...current, timestamp: now + 3_600_000 }] }, now)).toEqual(expected)
    expect(readFrame('1H', { ...series, candles: [...series.candles, { ...current, close: NaN }] }, now)).toEqual(expected)
  })
  it('does not label stale, mock, disconnected, gapped or short histories as live directional evidence', () => {
    const s = fixture('1H')
    expect(readFrame('1H', { ...s, dataQuality: 'mock' }, now).issue).toBe('mock')
    expect(readFrame('1H', { ...s, updatedAt: now - 91_000 }, now).issue).toBe('stale')
    expect(readFrame('1H', { ...s, connectionStatus: 'reconnecting' }, now).issue).toBe('disconnected')
    expect(readFrame('1H', { ...s, candles: s.candles.filter((_, i) => i !== 65) }, now).issue).toBe('gaps')
    expect(readFrame('1H', { ...s, candles: s.candles.slice(-49) }, now).issue).toBe('history')
    const stale = Object.fromEntries(Object.entries(all()).map(([key, value]) => [key, { ...value, updatedAt: now - 100_000 }])) as ReturnType<typeof all>
    expect(buildCryptoDecision(stale, now)).toMatchObject({ price: null, direction: 'unavailable', plan: null })
  })
  it('labels a volatility extension when no resistance above price has been observed', () => {
    const series = all()
    for (const frame of Object.keys(series) as AnalysisFrame[]) series[frame].currentPrice = 290
    expect(buildCryptoDecision(series, now).plan?.targetBasis).toBe('atr')
  })
  it('skips resistance that overlaps the entry zone instead of hiding an otherwise valid plan', () => {
    const series = all()
    for (const frame of Object.keys(series) as AnalysisFrame[]) series[frame].currentPrice = 276
    const plan = buildCryptoDecision(series, now).plan
    expect(plan).not.toBeNull()
    expect(plan!.targetBasis).toBe('observed')
    expect(plan!.resistance[0]).toBeGreaterThan(plan!.entry[1])
  })
})

describe('large execution sample, not whale identification', () => {
  const sample = Array.from({ length:20 }, (_, i) => ({ id: String(i), timestamp: now - i * 1000, price: 100, amount: i < 5 ? 10 : 1, side: i < 4 ? 'buy' as const : 'sell' as const }))
  it('measures notional buy share and deduplicates identical executions', () => {
    expect(tradeFlow([...sample, sample[0]], now)).toMatchObject({ direction: 'buy', ratio: 0.8, count:20, largeCount:5, threshold:1000, buy:4000, sell:1000 })
    expect(tradeFlow(sample.map(t => ({...t, side: t.side === 'buy' ? 'sell' : 'buy'})), now).direction).toBe('sell')
  })
  it('suppresses conclusions on too few, stale, invalid or future executions', () => {
    expect(tradeFlow(sample.slice(0, 9), now).ratio).toBeNull()
    expect(tradeFlow(sample, now + 61_000).direction).toBe('unavailable')
    expect(tradeFlow(sample.map(t => ({...t, timestamp: now + 10_000})), now).count).toBe(0)
    expect(tradeFlow(sample.map(t => ({...t, amount: Infinity})), now).count).toBe(0)
  })
})
