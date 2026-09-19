import { describe, expect, it } from 'vitest'

import { newsArticles } from '@/services/dashboard/mockDashboardData'
import type { MarketInstrument } from '@/types/market'
import { createMockScenarioAnalysis } from './mockScenarioService'
import { buildAiAnalysisContext } from './aiAnalysisContextBuilder'

const crypto: MarketInstrument = {
  id: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', marketType: 'upbit-krw', providerType: 'upbit',
  quoteCurrency: 'KRW', lastPrice: 4_126, change24hPercent: -0.72, volume24h: 68_330_000_000,
}

describe('AI analysis context builder', () => {
  it('creates a transparent input package for a selected crypto instrument', () => {
    const result = buildAiAnalysisContext({
      instrument: crypto,
      scenario: createMockScenarioAnalysis(crypto, 'en', 'short'),
      relatedNews: newsArticles.filter((article) => article.relatedSymbols.includes('XRP/KRW')),
      newsProviderMode: 'mock', marketDataMode: 'live', connectionStatus: 'live', language: 'en',
      now: () => new Date('2026-09-19T00:00:00.000Z'),
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.input.instrument).toMatchObject({ id: 'upbit-xrp', symbol: 'XRP/KRW', assetType: 'crypto', marketLabel: 'Upbit' })
    expect(result.input.quote.quoteStatus).toBe('available')
    expect(result.input.marketContext).toMatchObject({ isLive: true, sessionStatus: 'always-open' })
    expect(result.input.newsContext).toMatchObject({ isDemoOnly: true, isRealNewsAvailable: false })
    expect(result.input.missingInputs.realAi).toBe(true)
    expect(result.input.missingInputs.realNewsBackend).toBe(true)
  })

  it('marks incomplete price evidence and missing infrastructure without throwing', () => {
    const result = buildAiAnalysisContext({
      instrument: { ...crypto, lastPrice: Number.NaN }, scenario: null, relatedNews: [], newsProviderMode: 'rss-ready',
      marketDataMode: 'mock', language: 'ko',
    })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.input.quote.quoteStatus).toBe('missing')
    expect(result.input.quote.currentPrice).toBeNull()
    expect(result.input.scenarioContext.evidenceState).toBe('missing')
    expect(result.input.missingInputs).toEqual({ realAi: true, realNewsBackend: true, backtesting: true, portfolioContext: true, realProbabilityModel: true })
  })

  it('returns an unavailable context when no instrument is selected', () => {
    expect(buildAiAnalysisContext({ instrument: null, scenario: null, relatedNews: [], newsProviderMode: 'mock', marketDataMode: 'mock', language: 'en' }))
      .toEqual({ status: 'unavailable', input: null, reason: 'instrument-missing' })
  })
})
