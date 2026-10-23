import { describe, expect, it } from 'vitest'
import { backtest, closedCandles, kimchiPremium, numeric, percentile, positionRisk, providerNow, sourceData, volatilitySummary, type PositionInput, type ResearchSnapshot } from './researchModel'
import type { Candle } from '@/types/marketDetail'
const risk: PositionInput = { side: 'long', entry: 100, mark: 110, margin: 100, leverage: 10, maintenancePercent: .5, feePercent: .05, fundingPercent: .01, fundingIntervalHours: 8, hours: 24 }
const candles = (length: number): Candle[] => Array.from({ length }, (_, i) => ({ timestamp: i * 3_600_000, open: 100 + i, high: 100.5 + i, low: 99.5 + i, close: 100 + i, volume: 10 }))
describe('position risk and conversion', () => {
  it('uses position notional for fees and signed funding; distinguishes long and short', () => {
    const long = positionRisk(risk)!, short = positionRisk({ ...risk, side: 'short' })!
    expect(long.pnl).toBe(100); expect(short.pnl).toBe(-100)
    expect(long.fees).toBeCloseTo(1.05); expect(long.funding).toBeCloseTo(.33); expect(short.funding).toBeCloseTo(-.33)
    expect(long.liquidation).toBeCloseTo(90 / .995); expect(short.liquidation).toBeCloseTo(110 / 1.005)
    expect(long.net).toBeCloseTo(98.62)
  })
  it('rejects impossible margin conditions, missing prices and nonfinite inputs', () => {
    expect(positionRisk({ ...risk, maintenancePercent: 10 })).toBeNull()
    expect(positionRisk({ ...risk, mark: 0 })).toBeNull()
    expect(positionRisk({ ...risk, hours: Infinity })).toBeNull()
    expect(positionRisk({ ...risk, leverage: 126 })).toBeNull()
  })
  it('does not manufacture premiums, percentiles or numeric zero from missing values', () => {
    expect(kimchiPremium(154500, 100, 1500)).toBeCloseTo(3)
    expect(kimchiPremium(1, 0, 1)).toBeNull()
    expect(numeric(null)).toBeNull(); expect(numeric(false)).toBeNull(); expect(numeric('')).toBeNull()
    expect(percentile([1, 2], 2)).toBeNull()
  })
})
describe('past signal distribution', () => {
  it('filters unfinished, malformed and duplicate candles', () => {
    expect(closedCandles([[1, 10, 11, 9, 10, 2, 100], [1, 10, 11, 9, 10, 2, 100], [101, 10, 11, 9, 10, 2, 200], [3, 10, 8, 9, 10, 2, 100]], 150)).toHaveLength(1)
  })
  it('enters on next open and treats simultaneous targets as unknown', () => {
    const series = candles(24)
    series[21] = { ...series[21]!, open: 120, close: 120, high: 123, low: 117 }
    const result = backtest(series, { signals: ['aboveMean'], horizon: 3, targetPercent: 2, side: 'long', roundTripCostPercent: .2 })!
    expect(result.ambiguous).toBe(1); expect(result.samples).toBe(0); expect(result.proportion).toBeNull()
  })
  it('subtracts costs, includes timeouts and uses non-overlapping windows', () => {
    const result = backtest(candles(70), { signals: ['aboveMean'], horizon: 5, targetPercent: 90, side: 'long', roundTripCostPercent: .2 })!
    expect(result.samples).toBe(9); expect(result.timeout).toBe(9); expect(result.proportion).toBe(0)
    expect(result.meanNetPercent).toBeGreaterThan(0); expect(result.interval![1]).toBeGreaterThan(0)
    const gross = backtest(candles(70), { signals: ['aboveMean'], horizon: 5, targetPercent: 90, side: 'long', roundTripCostPercent: 0 })!
    expect(gross.meanNetPercent! - result.meanNetPercent!).toBeCloseTo(.2)
  })
  it('rejects gaps in forward evaluation and trailing volatility', () => {
    const series = candles(24); series[22]!.timestamp += 1
    expect(backtest(series, { signals: ['aboveMean'], horizon: 3, targetPercent: 2, side: 'long', roundTripCostPercent: 0 })!.samples).toBe(0)
    const vol = candles(25); vol[20]!.timestamp += 1; expect(volatilitySummary(vol)).toBeNull()
  })
  it('withdraws expired provider data', () => {
    const snapshot: ResearchSnapshot = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: 1000, sources: { mark: { status: 'available', source: 'Binance', receivedAt: 1000, data: { markPrice: '100', time: 1000 } } } }
    expect(sourceData(snapshot, 'mark', 200_000)).toBeNull()
    expect(sourceData(snapshot, 'mark', 1001)).toEqual({ markPrice: '100', time: 1000 })
  })
  it('handles a PC clock five minutes ahead without accepting cached old quotes', () => {
    const snapshot: ResearchSnapshot = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: 500_000, sources: { mark: { status: 'available', source: 'Binance', receivedAt: 500_000, serverTime: 200_000, ageMs: 0, data: { time: 199_000, markPrice: '100' } } } }
    expect(providerNow(snapshot, 'mark', 500_100)).toBe(200_100)
    expect(sourceData(snapshot, 'mark', 500_100)).not.toBeNull()
    snapshot.sources.mark.ageMs = 240_000
    expect(sourceData(snapshot, 'mark', 500_100)).toBeNull()
  })
  it('uses exchange time to exclude an unfinished candle even when the PC clock is ahead', () => {
    const snapshot: ResearchSnapshot = { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: 3_900_000, sources: { candles: { status: 'available', source: 'Binance', receivedAt: 3_900_000, serverTime: 3_599_000, data: [[0, 10, 11, 9, 10, 2, 3_599_999]] } } }
    expect(closedCandles(snapshot.sources.candles.data, providerNow(snapshot, 'candles', 3_900_000))).toEqual([])
  })
})
