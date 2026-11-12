import { describe, expect, it } from 'vitest'
import { analysisIntervals, buildCryptoDecision, type AnalysisFrame, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import { buildCryptoPriceScenarios, buildStockPriceScenarios } from './priceScenarios'
const now = Date.parse('2026-11-12T12:00:00Z')
const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 279, change24hPercent: 1, volume24h: 1000 }
function series(frame: AnalysisFrame, trend = 1): AnalysisSeries {
  const interval = analysisIntervals[frame], end = Math.floor(now / interval) * interval
  return { dataQuality: 'live', connectionStatus: 'live', currentPrice: 200 + trend * 79, updatedAt: now, candles: Array.from({ length: 80 }, (_, i) => {
    const close = 200 + trend * i
    return { timestamp: end - (80 - i) * interval, open: close, close, high: close + 3, low: close - 3, volume: 100 }
  }) }
}
function inputs(trend = 1) { return { '1H': series('1H', trend), '4H': series('4H', trend), '1D': series('1D', trend) } }
describe('conditional price scenarios', () => {
  it.each([1, -1])('retains the existing first zones and opposing thresholds for trend %s', trend => {
    const decision = buildCryptoDecision(inputs(trend), now), model = buildCryptoPriceScenarios(instrument, decision)
    expect(model.status).toBe('ready')
    expect([model.upside.first?.low, model.upside.first?.high]).toEqual(decision.plan!.resistance)
    expect([model.downside.first?.low, model.downside.first?.high]).toEqual(decision.plan!.entry)
    expect(model.upside.reassess).toBe(decision.plan!.stop)
    expect(model.downside.reassess).toBe(decision.plan!.sellInvalidation)
    expect(model.upside.next!.low).toBeGreaterThan(model.upside.first!.high)
    expect(model.downside.next!.high).toBeLessThan(model.downside.first!.low)
    expect(model.upside.reassess!).toBeLessThan(model.price!)
    expect(model.downside.reassess!).toBeGreaterThan(model.price!)
  })
  it('labels extension levels as estimates and can handle prices outside observed history without a long plan', () => {
    const data = inputs()
    Object.values(data).forEach(s => { s.currentPrice = 100 })
    const decision = buildCryptoDecision(data, now)
    expect(decision.plan).toBeNull()
    const model = buildCryptoPriceScenarios(instrument, decision)
    expect(model.downside.first!.basis).toBe('atr')
    expect(model.downside.first!.high).toBeLessThan(100)
    expect(model.upside.first!.basis).toBe('observed')
    const atHigh = buildCryptoPriceScenarios(instrument, buildCryptoDecision(inputs(), now))
    expect(atHigh.upside.next!.basis).toBe('atr')
  })
  it.each(['mock', 'stale', 'gaps'] as const)('withholds both price ladders for %s evidence', issue => {
    const data = inputs()
    Object.values(data).forEach(s => {
      if (issue === 'mock') s.dataQuality = 'mock'
      if (issue === 'stale') s.updatedAt = now - 91_000
      if (issue === 'gaps') s.candles = s.candles.filter((_, i) => i !== 65)
    })
    const model = buildCryptoPriceScenarios(instrument, buildCryptoDecision(data, now))
    expect(model.status).toBe('unavailable')
    expect(model.price).toBeNull()
    expect(model.upside.first).toBeNull()
    expect(model.downside.first).toBeNull()
  })
  it('uses only a usable reference frame and preserves the instrument and quote currency', () => {
    const data = inputs(); data['4H'].dataQuality = 'mock'
    const model = buildCryptoPriceScenarios({ ...instrument, id: 'binance-spot-btcusdt', marketId: 'binance-spot', quoteCurrency: 'USDT' }, buildCryptoDecision(data, now))
    expect(model.frame).toBe('1D')
    expect(model.instrumentId).toBe('binance-spot-btcusdt')
    expect(model.currency).toBe('USDT')
    expect(model.venue).toBe('binance-spot')
  })
  it('does not invent a zero floor when a volatility extension would be non-positive', () => {
    const data = inputs(); Object.values(data).forEach(s => { s.currentPrice = .01 })
    const model = buildCryptoPriceScenarios(instrument, buildCryptoDecision(data, now))
    expect(model.status).toBe('ready')
    expect(model.downside.first).toBeNull()
    expect(model.downside.next).toBeNull()
    expect(model.upside.reassess).toBeNull()
  })
  it('keeps fractional quote prices finite and does not mutate the source decision', () => {
    const data = inputs()
    Object.values(data).forEach(s => { s.currentPrice! /= 1e8; s.candles = s.candles.map(c => ({ ...c, open:c.open/1e8, high:c.high/1e8, low:c.low/1e8, close:c.close/1e8 })) })
    const decision = buildCryptoDecision(data, now), original = JSON.stringify(decision)
    const model = buildCryptoPriceScenarios({ ...instrument, id:'upbit-xrp-btc', quoteCurrency:'BTC' }, decision)
    expect(model.upside.first!.low).toBeGreaterThan(0)
    expect(model.downside.next!.low).toBeGreaterThan(0)
    expect(model.currency).toBe('BTC')
    expect(JSON.stringify(decision)).toBe(original)
  })
})
describe('stock price scenarios', () => {
  const stock: MarketInstrument = { ...instrument, id:'us-aapl', marketId:'us-stock', symbol:'AAPL', quoteCurrency:'USD' }
  it('uses daily observed levels, tolerates non-trading days and excludes a forming daily bar', () => {
    const data = series('1D'); data.currentPrice = 260
    data.candles = data.candles.filter(c => ![0,6].includes(new Date(c.timestamp).getUTCDay()))
    const before = buildStockPriceScenarios(stock, data, now)
    data.candles = [...data.candles, { timestamp:now, open:260, close:260, high:1e9, low:.01, volume:100 }]
    const model = buildStockPriceScenarios(stock, data, now)
    expect(model).toEqual(before)
    expect(model.status).toBe('ready')
    expect(model.upside.first!.basis).toBe('observed')
    expect(model.downside.first!.high).toBeLessThan(260)
    expect(model.upside.first!.low).toBeGreaterThan(260)
    expect(model.currency).toBe('USD')
    expect(model.atr).toBeNull()
  })
  it('does not invent resistance at a new high', () => {
    const data = series('1D'); data.currentPrice = 1000
    expect(buildStockPriceScenarios(stock, data, now).upside.first).toBeNull()
  })
  it('withholds stale, mock and insufficient stock evidence', () => {
    const data = series('1D')
    expect(buildStockPriceScenarios(stock, { ...data, updatedAt:now-91_000 }, now).status).toBe('unavailable')
    expect(buildStockPriceScenarios(stock, { ...data, updatedAt:now+61_000 }, now).status).toBe('unavailable')
    expect(buildStockPriceScenarios(stock, { ...data, dataQuality:'mock' }, now).status).toBe('unavailable')
    expect(buildStockPriceScenarios(stock, { ...data, candles:data.candles.slice(-10) }, now).issue).toBe('history')
    expect(buildStockPriceScenarios(stock, { ...data, candles:data.candles.slice(0,50) }, now).issue).toBe('history')
  })
})
