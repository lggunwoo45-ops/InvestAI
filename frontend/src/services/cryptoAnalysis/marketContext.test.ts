import { describe, expect, it } from 'vitest'
import { withMarketContext } from './marketContext'
import { decisionGuide } from './decisionGuide'
import type { AnalysisSeries, CryptoDecision } from './cryptoDecisionEngine'
const now = 1_800_000_000_000
const decision: CryptoDecision = { direction: 'buy', action: 'entry', frames: [], price: 100, coverage: 3, plan: null, extended: false, mixed: false }
const series = (side: 'buy' | 'sell', age = 0): Record<'1H' | '4H' | '1D', AnalysisSeries> => {
  const read: AnalysisSeries = { candles: [], dataQuality: 'live', currentPrice: 100, connectionStatus: 'live', updatedAt: now - age, recentTrades: Array.from({ length: 20 }, (_, i) => ({ id: String(i), timestamp: now - age - i * 1000, price: 100, amount: i < 5 ? 10 : 1, side })) }
  return { '1H': read, '4H': read, '1D': read }
}
const dominance = { point: { percent: 58, at: now, marketChange: 1 }, previous: { percent: 57, at: now - 86_400_000, marketChange: 0 } }
describe('optional context across crypto decisions', () => {
  it('withholds entry for selling pressure without changing the trend or inventing a target', () => {
    const result = withMarketContext(decision, series('sell'), { quoteCurrency: 'KRW', symbol: 'ETH/KRW' }, dominance, now)
    expect(result).toMatchObject({ direction: 'buy', action: 'wait', plan: null, context: { cautions: ['selling', 'altWeakness'] } })
    expect(decisionGuide(result, 'ko').reason).toContain('매도')
    expect(decisionGuide(result, 'ko').reason).toContain('BTC 비중')
  })
  it.each(['BTC', 'BTC/KRW', 'BTCUSDT', 'BTCFDUSD'])('does not label %s an altcoin', symbol => {
    expect(withMarketContext(decision, series('buy'), { symbol, quoteCurrency: symbol === 'BTCFDUSD' ? 'FDUSD' : symbol === 'BTCUSDT' ? 'USDT' : 'KRW' }, dominance, now).context?.cautions).toEqual([])
  })
  it('withholds stale, mock or future context and preserves a technical entry', () => {
    const stale = { ...dominance, point: { ...dominance.point, at: now - 3_600_001 } }
    expect(withMarketContext(decision, series('sell', 91_000), { quoteCurrency: 'KRW', symbol: 'ETHUSDT' }, stale, now)).toMatchObject({ action: 'entry', context: { flow: 'unavailable', dominanceDelta: null } })
    const mock = series('sell'); Object.values(mock).forEach(s => { s.dataQuality = 'mock' })
    expect(withMarketContext(decision, mock, { quoteCurrency: 'KRW', symbol: 'ETHUSDT' }, { ...dominance, point: { ...dominance.point, at: now + 61_000 } }, now).context?.cautions).toEqual([])
  })
  it('does not convert a sell, neutral or unavailable decision into a buy', () => {
    for (const direction of ['sell', 'neutral', 'unavailable'] as const) {
      const before = { ...decision, direction, action: 'wait' as const }
      expect(withMarketContext(before, series('buy'), { quoteCurrency: 'KRW', symbol: 'ETHUSDT' }, null, now)).toMatchObject({ direction, action: 'wait' })
    }
  })
  it('does not compare dominance observations less than 30 minutes apart', () => {
    expect(withMarketContext(decision, series('buy'), { quoteCurrency: 'KRW', symbol: 'ETH/KRW' }, { ...dominance, previous: { ...dominance.previous, at: now - 1000 } }, now).context?.dominanceDelta).toBeNull()
  })
})

it('limits stored decisions to the freshness of their supporting context', () => {
  const result = withMarketContext(decision, series('sell', 50_000), { symbol: 'ETH/KRW', quoteCurrency: 'KRW' }, null, now)
  expect(result.context?.validUntil).toBe(now + 10_000)
  expect(result.context?.flowSample.direction).toBe(result.context?.flow)
})
