import { describe, expect, it } from 'vitest'

import { newsArticles } from '@/services/dashboard/mockDashboardData'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { NewsArticle } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'
import { createMockScenarioAnalysis } from './mockScenarioService'
import { buildAiAnalysisContext } from './aiAnalysisContextBuilder'

const crypto: MarketInstrument = {
  id: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', marketType: 'upbit-krw', providerType: 'upbit',
  quoteCurrency: 'KRW', lastPrice: 4_126, change24hPercent: -0.72, volume24h: 68_330_000_000,
}
const mockNews: NewsLoadResult = { requestedMode: 'mock', state: 'mock', source: 'mock', providerLabel: 'InvestAI Demo Desk', articles: newsArticles, lastUpdatedAt: null, error: null, fallback: false }
const macroRssArticle: NewsArticle = { id: 'rss-fed-macro', title: 'Federal Reserve issues FOMC statement', summary: 'Official macro policy context.', source: 'Federal Reserve Board', publishedAt: '2026-09-19T00:00:00.000Z', category: 'macro', relatedMarkets: ['macro'], relatedSymbols: [], sentiment: 'unassessed', importance: 'unassessed', isMock: false }
const localProxyNews: NewsLoadResult = { requestedMode: 'local-proxy', state: 'local-proxy-ready', source: 'local-proxy', providerLabel: 'Federal Reserve Board · Local Proxy', articles: [macroRssArticle], lastUpdatedAt: '2026-09-19T00:00:00.000Z', error: null, fallback: false }

describe('AI analysis context builder', () => {
  it('creates a transparent input package for a selected crypto instrument', () => {
    const result = buildAiAnalysisContext({
      instrument: crypto,
      scenario: createMockScenarioAnalysis(crypto, 'en', 'short'),
      newsProviderMode: 'mock', newsResult: mockNews, marketDataMode: 'live', connectionStatus: 'live', language: 'en',
      now: () => new Date('2026-09-19T00:00:00.000Z'),
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.input.instrument).toMatchObject({ id: 'upbit-xrp', symbol: 'XRP/KRW', assetType: 'crypto', marketLabel: 'Upbit' })
    expect(result.input.quote.quoteStatus).toBe('available')
    expect(result.input.marketContext).toMatchObject({ isLive: true, sessionStatus: 'always-open' })
    expect(result.input.newsContext).toMatchObject({ isDemoOnly: true, isRealNewsAvailable: false, evidenceLabel: 'demo-news', evidenceScope: 'demo-only' })
    expect(result.input.missingInputs.realAi).toBe(true)
    expect(result.input.missingInputs.realNewsBackend).toBe(true)
  })

  it('marks incomplete price evidence and missing infrastructure without throwing', () => {
    const result = buildAiAnalysisContext({
      instrument: { ...crypto, lastPrice: Number.NaN }, scenario: null, newsProviderMode: 'rss-ready', newsResult: null,
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
    expect(buildAiAnalysisContext({ instrument: null, scenario: null, newsProviderMode: 'mock', newsResult: mockNews, marketDataMode: 'mock', language: 'en' }))
      .toEqual({ status: 'unavailable', input: null, reason: 'instrument-missing' })
  })

  it('marks Local Proxy RSS as real market-level evidence', () => {
    const result = buildAiAnalysisContext({ instrument: crypto, scenario: createMockScenarioAnalysis(crypto, 'en'), newsProviderMode: 'local-proxy', newsResult: localProxyNews, marketDataMode: 'mock', language: 'en' })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.input.newsContext).toMatchObject({
      providerStatus: 'local-proxy-ready', source: 'local-proxy', isDemoOnly: false,
      isRealNewsAvailable: true, isLocalProxyNews: true, evidenceLabel: 'local-proxy-rss', evidenceScope: 'market-level', relatedNewsCount: 0,
    })
    expect(result.input.newsContext.relatedHeadlines).toEqual([])
    expect(result.input.newsContext.marketLevelHeadlines).toEqual(['Federal Reserve issues FOMC statement'])
  })

  it('does not mark macro RSS as instrument-specific without an explicit symbol link', () => {
    const result = buildAiAnalysisContext({ instrument: crypto, scenario: null, newsProviderMode: 'local-proxy', newsResult: localProxyNews, marketDataMode: 'mock', language: 'en' })
    if (result.status !== 'ready') throw new Error('Expected ready context')
    expect(result.input.newsContext.evidenceScope).not.toBe('instrument-specific')
    expect(result.input.newsContext.relatedNewsCount).toBe(0)
  })
})
