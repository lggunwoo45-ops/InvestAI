import { describe, expect, it } from 'vitest'
import { buildReboundPath, parseAnalysisHorizon } from './reboundPath'
import { supportHistory, supportInstrument, supportNow } from '@/test/majorSupportFixture'
import type { AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { pathSeries } from '@/test/reboundPathFixture'

describe('horizon-specific rebound paths', () => {
  it('separates the first obstacle from the main observed target and uses explicit percentage bases', () => {
    const m = buildReboundPath(supportInstrument, pathSeries(), null, 'intraday', supportNow)
    expect(m.status).toBe('ready')
    expect(m.first!.center).toBe(106)
    expect(m.target!.center).toBeGreaterThan(m.first!.high)
    expect(m.support!.center).toBeLessThan(100)
    expect(m.invalidation).toBeLessThan(m.support!.low)
    expect(m.upside).toBeCloseTo((m.target!.center / 100 - 1) * 100)
    expect(m.fromSupport).toBeCloseTo((m.target!.center / m.support!.center - 1) * 100)
    expect(m.fromSupport).toBeGreaterThan(m.upside!)
    expect(m.intermediate.every(l => l.center > m.first!.center && l.center < m.target!.center)).toBe(true)
  })
  it('actually changes the evidence and support for a longer horizon, without borrowing short history', () => {
    const short = buildReboundPath(supportInstrument, pathSeries(), null, 'intraday', supportNow)
    const long = buildReboundPath(supportInstrument, pathSeries(), supportHistory(), 'position', supportNow)
    expect(long.status).toBe('ready'); expect(long.frame).toBe('1D'); expect(long.bars).toBe(400)
    expect(long.support!.center).toBe(82); expect(long.support!.basis).toBe('confluence')
    expect(long.support!.center).not.toBe(short.support!.center)
    const missing = buildReboundPath(supportInstrument, pathSeries(), null, 'position', supportNow)
    expect(missing.status).not.toBe('ready'); expect(missing.support).toBeNull()
  })
  it.each(['upbit', 'binance-spot', 'binance-futures'] as const)('preserves the selected %s instrument and currency', marketId => {
    const instrument = { ...supportInstrument, id: `${marketId}-btc`, marketId, quoteCurrency: marketId === 'upbit' ? 'KRW' : 'USDT' }
    const m = buildReboundPath(instrument, pathSeries(), null, 'intraday', supportNow)
    expect(m).toMatchObject({ status: 'ready', instrumentId: instrument.id, venue: marketId, currency: instrument.quoteCurrency, price: 100 })
    if (marketId !== 'upbit') expect(buildReboundPath(instrument, pathSeries(), supportHistory(), 'position', supportNow).status).not.toBe('ready')
  })
  it('never fabricates a further target at all-time highs or for a single resistance', () => {
    const high = buildReboundPath(supportInstrument, pathSeries(200), null, 'intraday', supportNow)
    expect(high.first).toBeNull(); expect(high.target).toBeNull(); expect(high.upside).toBeNull()
    const one = pathSeries(); Object.values(one).forEach(s => { s.candles = s.candles.map(c => ({ ...c, high: 120 })) })
    const m = buildReboundPath(supportInstrument, one, null, 'intraday', supportNow)
    expect(m.first!.center).toBe(120); expect(m.first!.basis).toBe('range'); expect(m.target).toBeNull()
  })
  it('keeps intervening resistance visible for remote targets and requires a support basis', () => {
    const series = pathSeries()
    series['1H'].candles = series['1H'].candles.map((c, i) => [4, 20, 36, 52, 68, 84].includes(i) ? { ...c, high: 180 } : c)
    const m = buildReboundPath(supportInstrument, series, null, 'intraday', supportNow)
    expect(m.target!.center).toBe(180)
    expect(m.intermediate.length).toBeGreaterThan(0)
    expect(m.distantTarget).toBe(true)
    series['1H'].candles = series['1H'].candles.map((c, i) => [10, 26, 42, 58].includes(i) ? { ...c, high: 130 + [10, 26, 42, 58].indexOf(i) * 10 } : c)
    const nearer = buildReboundPath(supportInstrument, series, null, 'intraday', supportNow)
    expect(nearer.target!.center).toBeLessThan(140)
    const below = buildReboundPath(supportInstrument, pathSeries(50), null, 'intraday', supportNow)
    expect(below.support).toBeNull(); expect(below.target).toBeNull(); expect(below.upside).toBeNull()
  })
  it('ignores forming bars and marks an actual rejection only from the last completed bar', () => {
    const series = pathSeries(), base = buildReboundPath(supportInstrument, series, null, 'intraday', supportNow)
    series['1H'].candles = [...series['1H'].candles, { timestamp: supportNow, open: 100, close: 100, low: 1, high: 9999, volume: 500 }]
    expect(buildReboundPath(supportInstrument, series, null, 'intraday', supportNow).target).toEqual(base.target)
    series['1H'].candles = series['1H'].candles.slice(0, -1).map((c, i) => i === 119 ? { ...c, high: 107, low: 99, close: 100 } : c)
    const rejected = buildReboundPath(supportInstrument, series, null, 'intraday', supportNow); expect(rejected).toMatchObject({ resistanceState: 'rejected', status: 'ready', first: { center: 106 } })
  })
  it('excludes stale, mock, disconnected and gapped short-term data instead of reusing another frame', () => {
    for (const mutate of [(s: AnalysisSeries) => { s.updatedAt = supportNow - 90_001 }, (s: AnalysisSeries) => { s.dataQuality = 'mock' }, (s: AnalysisSeries) => { s.connectionStatus = 'disconnected' }, (s: AnalysisSeries) => { s.candles = s.candles.filter((_, i) => i !== 100) }]) {
      const series = pathSeries(); mutate(series['1H'])
      const m = buildReboundPath(supportInstrument, series, null, 'intraday', supportNow)
      expect(m.status).not.toBe('ready'); expect(m.target).toBeNull(); expect(m.invalidation).toBeNull()
    }
  })
  it('rejects insufficient, stale, malformed and wrong-currency long history', () => {
    for (const history of [{ ...supportHistory(), candles: supportHistory().candles.slice(-120) }, { ...supportHistory(), fetchedAt: supportNow - 1_800_001 }, { ...supportHistory(), currency: 'USDT' }, { ...supportHistory(), candles: [...supportHistory().candles, supportHistory().candles[0]] }]) {
      expect(buildReboundPath(supportInstrument, pathSeries(), history, 'position', supportNow).status).not.toBe('ready')
    }
    expect(parseAnalysisHorizon('position')).toBe('position'); expect(parseAnalysisHorizon('bad')).toBe('intraday')
  })
})



