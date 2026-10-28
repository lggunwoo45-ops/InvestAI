import { expect, it } from 'vitest'
import { defaultExplorerConfig, type DerivativeContextPoint, type ExplorerConfig } from './signalExplorer'
import { validateSignalHistory, type ValidationCosts } from './signalValidation'
import type { ResearchHistory } from './researchClient'
import type { FundingHistory } from './fundingSettlements'
const hour = 3_600_000, base = Date.UTC(2026, 0, 1)
const config: ExplorerConfig = { ...defaultExplorerConfig, signals: ['three-long'], window: 1, horizon: 4, target: 2 }
const costs: ValidationCosts = { fee: .05, slippage: .1, dailyHolding: 0 }
function history(n = 400, falling = false): ResearchHistory {
  return { version: 1, asset: 'BTC', timeframe: '1h', requested: 1000, source: 'Binance USDⓈ-M', fetchedAt: base + n * hour, asOf: base + n * hour,
    candles: Array.from({ length: n }, (_, i) => {
      const direction = falling ? -1 : 1, open = 100 + i * .1 * direction, close = open + .05 * direction
      return { timestamp: base + i * hour, open, close, high: Math.max(open, close) + .1, low: Math.min(open, close) - .1, volume: 100 }
    }) }
}
it('uses next-open entry and both executed notionals for fees with adverse slippage', () => {
  const data = history(), r = validateSignalHistory(data, config, costs), t = r.training.trades[0]
  expect(t.enteredAt).toBe(data.candles[61].timestamp)
  expect(t.entry).toBe(data.candles[61].open)
  expect(t.exitLow).toBe(data.candles[64].close)
  const ratio = t.exitLow * .999 / (t.entry * 1.001)
  expect(t.netLow).toBeCloseTo((ratio - 1) * 100 - .05 * (1 + ratio), 10)
  expect(t.netLow).toBeLessThan(t.grossLow)
})
it('handles shorts with sell-entry/buy-exit slippage and charges both sides', () => {
  const data = history(400, true), r = validateSignalHistory(data, { ...config, side: 'short', signals: ['three-short'] }, costs), t = r.training.trades[0]
  const ratio = t.exitLow * 1.001 / (t.entry * .999)
  expect(t.netLow).toBeCloseTo((1 - ratio) * 100 - .05 * (1 + ratio), 10)
  expect(t.grossLow).toBeGreaterThan(0)
})
it('purges full observation windows across the fixed chronological split and leaves incomplete tail out', () => {
  const data = history(), r = validateSignalHistory(data, { ...config, horizon: 24 }, costs)
  expect(r.splitAt).toBe(data.candles[60 + Math.floor(340 * .7)].timestamp)
  expect(r.training.incomplete).toBeGreaterThan(0)
  expect(r.validation.incomplete).toBeGreaterThan(0)
  expect(r.training.trades.every(t => t.signalAt + 25 * hour <= r.splitAt)).toBe(true)
  expect(r.validation.trades.every(t => t.signalAt >= r.splitAt && t.signalAt + 25 * hour <= data.asOf)).toBe(true)
  for (const part of [r.training, r.validation]) for (let i = 1; i < part.trades.length; i++) expect(part.trades[i].enteredAt - part.trades[i - 1].enteredAt).toBeGreaterThanOrEqual(24 * hour)
})
it('does not let any validation prices alter training signals or outcomes', () => {
  const data = history(), first = validateSignalHistory(data, config, costs)
  const changed = structuredClone(data)
  for (const c of changed.candles.filter(c => c.timestamp >= first.splitAt)) for (const key of ['open', 'close', 'high', 'low'] as const) c[key] *= 2
  expect(validateSignalHistory(changed, config, costs).training).toEqual(first.training)
})
it('keeps same-bar double touches as loss-to-win bounds instead of dropping them', () => {
  const data = history(); data.candles.forEach(c => { c.high += 10; c.low -= 10 })
  const r = validateSignalHistory(data, config, costs), s = r.validation.stats
  expect(s.samples).toBeGreaterThan(0)
  expect(s.ambiguous).toBe(s.samples)
  expect(s.meanNetLow).toBeLessThan(-2)
  expect(s.meanNetHigh).toBeLessThan(2)
  expect(s.meanNetHigh).toBeGreaterThan(0)
  expect(s.positiveLow).toBe(0)
  expect(s.positiveHigh).toBe(s.samples)
  const short = validateSignalHistory(data, { ...config, side: 'short' }, costs).validation.stats
  expect(short.meanNetLow).toBeLessThan(-2)
  expect(short.meanNetHigh).toBeGreaterThan(0)
})
it('uses an opening gap fill rather than an unreachable barrier price', () => {
  const data = history(); data.candles[62] = { ...data.candles[62], open: 90, high: 91, low: 89, close: 90 }
  const t = validateSignalHistory(data, config, costs).training.trades[0]
  expect(t.outcome).toBe('down'); expect(t.exitLow).toBe(90)
  expect(t.observedThrough).toBe(data.candles[62].timestamp)
  expect(t.netLow).toBeLessThan(-10)
})
it('charges the explicit daily holding assumption pro rata, using the exit candle end if time is unknown', () => {
  const a = validateSignalHistory(history(), config, costs), b = validateSignalHistory(history(), config, { ...costs, dailyHolding: .24 })
  expect(a.training.trades[0].netLow - b.training.trades[0].netLow).toBeCloseTo(.04, 10)
  expect(b.training.trades[0].observedThrough - b.training.trades[0].enteredAt).toBe(4 * hour)
})
it('does not double count the legacy explorer cost or change the existing config', () => {
  const a = validateSignalHistory(history(), config, costs), b = validateSignalHistory(history(), { ...config, cost: 9 }, costs)
  expect(a.training).toEqual(b.training)
  expect(a.input.config.cost).toBe(.2)
})
it('rejects malformed or incomplete candles, unsorted timestamps, insufficient history and invalid costs', () => {
  for (const mutate of [(d: ResearchHistory) => { d.candles[20].close = NaN }, (d: ResearchHistory) => { d.candles[20].timestamp += 1 }, (d: ResearchHistory) => { d.candles[20].timestamp = d.candles[19].timestamp }, (d: ResearchHistory) => { d.asOf -= hour }, (d: ResearchHistory) => { d.timeframe = '4h' }]) {
    const data = history(); mutate(data); expect(() => validateSignalHistory(data, config, costs)).toThrow()
  }
  expect(() => validateSignalHistory(history(65), config, costs)).toThrow(/짧아요/)
  for (const v of [-1, 5.01, NaN, Infinity]) expect(() => validateSignalHistory(history(), config, { ...costs, fee: v })).toThrow()
})
it('skips discontinuous outcomes and waits for indicator warm-up after gaps', () => {
  const data = history(); data.candles.splice(90, 1)
  const r = validateSignalHistory(data, { ...config, horizon: 24 }, costs)
  expect(r.training.gaps).toBeGreaterThan(0)
  expect(r.training.trades.some(t => t.signalAt >= base + 91 * hour && t.signalAt < base + 151 * hour)).toBe(false)
})
it('does not drop selected derivative conditions or use future knowledge', () => {
  const data = history(), filtered = { ...config, funding: 'positive' as const }
  expect(() => validateSignalHistory(data, filtered, costs)).toThrow(/파생 자료/)
  const contexts = new Map<number, DerivativeContextPoint>(data.candles.map(c => {
    const at = c.timestamp + hour; return [at, { at, funding: { at: at - hour, knownAt: at + 1, value: .0001 }, openInterest: null }]
  }))
  const missing = validateSignalHistory(data, filtered, costs, contexts)
  expect(missing.validation.stats.samples).toBe(0); expect(missing.validation.stats.meanNetLow).toBeNull()
  expect(missing.validation.unknown).toBeGreaterThan(0)
  contexts.forEach(p => { p.funding!.knownAt = p.at - 1 })
  expect(validateSignalHistory(data, filtered, costs, contexts).validation.stats.samples).toBeGreaterThan(0)
})
it('exports a detached public-evidence record that reproduces the exact result', () => {
  const data = history(), r = validateSignalHistory(Object.assign(data, { privateNote: 'secret' }), Object.assign({ ...config }, { privateNote: 'secret' }), Object.assign({ ...costs }, { privateNote: 'secret' }))
  expect(JSON.stringify(r)).not.toContain('secret')
  const saved = JSON.parse(JSON.stringify(r))
  data.candles[0].close = 0
  expect(saved.input.history.candles[0].close).toBe(100.05)
  expect(validateSignalHistory(saved.input.history, saved.input.config, saved.input.costs)).toEqual(saved)
  expect(r.periods.reduce((n, p) => n + p.stats.samples, 0)).toBe(r.validation.stats.samples)
})
function fundingHistory(): FundingHistory {
  return { version: 1, asset: 'BTC', source: 'Binance USDⓈ-M', from: base, to: base + 400 * hour, fetchedAt: base + 400 * hour,
    records: Array.from({ length: 51 }, (_, i) => ({ at: base + i * 8 * hour, rate: .001, markPrice: 110 })) }
}
it('applies actual funding instead of daily holding, excludes missing evidence and exports reproducible costs', () => {
  const data = history(), funding = fundingHistory(), settled = { ...costs, funding: 'settled' as const, dailyHolding: 1 }
  const report = validateSignalHistory(data, { ...config, horizon: 12 }, settled, undefined, Object.assign(funding, { privateNote: 'secret' }))
  const t = report.training.trades[0], ratio = t.exitLow * .999 / (t.entry * 1.001)
  expect(t.funding!.debitHigh).toBeGreaterThan(0)
  expect(t.netLow).toBeCloseTo((ratio - 1) * 100 - .05 * (1 + ratio) - t.funding!.debitHigh, 10)
  expect(report.input.costs.dailyHolding).toBe(0)
  expect(JSON.stringify(report)).not.toContain('secret')
  expect(validateSignalHistory(report.input.history, report.input.config, report.input.costs, undefined, report.input.funding)).toEqual(report)
  const missing = validateSignalHistory(data, config, settled, undefined, { ...funding, records: [] })
  expect(missing.validation.stats.samples).toBe(0); expect(missing.validation.fundingExcluded).toBeGreaterThan(0)
  expect(missing.validation.stats.meanNetLow).toBeNull()
  expect(() => validateSignalHistory(data, config, settled)).toThrow('정산 기록')
  expect(() => validateSignalHistory({ ...data, source: 'Bybit' }, config, settled, undefined, funding)).toThrow('정산 기록')
  expect(() => validateSignalHistory(data, config, settled, undefined, { ...funding, asset: 'ETH' })).toThrow('정산 기록')
})
it('funding changes after the split cannot change training results, and assumed mode ignores supplied settlements', () => {
  const data = history(), funding = fundingHistory(), settled = { ...costs, funding: 'settled' as const }
  const first = validateSignalHistory(data, config, settled, undefined, funding)
  const changed = { ...funding, records: funding.records.map(r => ({ ...r, rate: r.at >= first.splitAt ? -.01 : r.rate })) }
  expect(validateSignalHistory(data, config, settled, undefined, changed).training).toEqual(first.training)
  expect(validateSignalHistory(data, config, costs, undefined, funding)).toEqual(validateSignalHistory(data, config, costs))
})
