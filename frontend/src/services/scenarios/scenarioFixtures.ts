import type { Scenario } from './scenarioStorage'
import type { AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'

// Shared deterministic fixtures for unit/UI tests; no production imports.
export const scenarioTestNow = Date.parse('2026-10-20T12:00:00Z')
export function scenarioFixture(id = 'upbit-btc'): Scenario {
  const asset = id.slice(6).toUpperCase()
  return {
    id, revision: 'revision-1', instrument: { id, marketId: 'upbit', symbol: `${asset}/KRW`, name: asset, quoteCurrency: 'KRW', lastPrice: 115, change24hPercent: 0, volume24h: 0 },
    createdAt: scenarioTestNow - 1000, updatedAt: scenarioTestNow - 1000, enabled: true, entry: [100, 110], target: 130, stop: 90,
    baseline: { at: scenarioTestNow - 1000, price: 115, direction: 'buy', frame: '1H', frameDirection: 'buy', frameAsOf: scenarioTestNow - 3_600_000 },
  }
}
export function scenarioSeries(price = 115, trend = 1, now = scenarioTestNow): AnalysisSeries {
  const end = Math.floor(now / 3_600_000) * 3_600_000
  return { currentPrice: price, dataQuality: 'live', connectionStatus: 'live', updatedAt: now,
    recentTrades: [{ id: String(now), timestamp: now, price, amount: 1, side: 'buy' }],
    candles: Array.from({ length: 80 }, (_, i) => {
      const close = 200 + trend * i
      return { timestamp: end - (80 - i) * 3_600_000, open: close, close, high: close + 3, low: close - 3, volume: 100 }
    }) }
}
