import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { createMockScenarioAnalysis, safelyCreateMockScenarioAnalysis } from './mockScenarioService'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 1, change24hPercent: 1, volume24h: 1 }
const stock: MarketInstrument = { ...crypto, id: 'us-nvda', marketId: 'us-stock', symbol: 'NVDA', name: 'NVIDIA', quoteCurrency: 'USD' }

describe('mock AI scenario foundation', () => {
  it('creates a complete non-predictive crypto scenario contract', () => {
    const analysis = createMockScenarioAnalysis(crypto, 'en', 'short')
    expect(analysis).toMatchObject({ instrumentId: crypto.id, providerMode: 'mock', confidence: null, marketBias: 'mixed', timeframe: 'short' })
    expect(Object.keys(analysis.scenarios)).toEqual(['bullish', 'neutral', 'bearish'])
    expect(Object.values(analysis.scenarios).every((scenario) => scenario.probability === null)).toBe(true)
    expect(analysis.rationale.join(' ')).toContain('BTC market influence')
    expect(analysis.riskFactors.join(' ')).toContain('volatility')
    expect(analysis.disclaimer).toContain('Not investment advice')
    expect(analysis.scenarioMap.bullish).toContain('confirmation')
    expect(analysis.evidence.missingEvidence).toEqual(['real-ai', 'real-news-backend'])
    expect(analysis.scenarios.bullish.status).toBe('watch')
    expect(analysis.scenarios.neutral.status).toBe('wait')
    expect(analysis.scenarios.bearish.status).toBe('risk')
  })

  it('uses generic stock context without inventing company facts or prices', () => {
    const analysis = createMockScenarioAnalysis(stock, 'en', 'medium')
    expect(analysis.timeframe).toBe('medium')
    expect(analysis.rationale.join(' ')).toContain('Sector and company movement')
    expect(analysis.rationale.join(' ')).toContain('Earnings and company news remain unverified placeholders')
    expect(analysis.tradePlan.firstInterestArea).not.toMatch(/\$|₩|buy/i)
  })

  it('provides Korean mock and safety copy without translating the symbol', () => {
    const analysis = createMockScenarioAnalysis(crypto, 'ko', 'long')
    expect(analysis.instrumentId).toBe('upbit-btc')
    expect(analysis.scenarios.bullish.label).toBe('상승 시나리오')
    expect(analysis.disclaimer).toContain('투자 조언이 아니며')
  })

  it('returns a graceful unavailable state for incomplete instrument data', () => {
    expect(safelyCreateMockScenarioAnalysis({ ...crypto, id: '', symbol: '' }, 'en', 'short')).toBeNull()
  })
})
