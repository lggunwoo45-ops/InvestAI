import { describe, expect, it } from 'vitest'

import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import { buildStockWatchCandidates } from './stockWatchCandidateEngine'

const korea: readonly MarketInstrument[] = [
  { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', marketType: 'kospi', providerType: 'mock-krx', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 2, volume24h: 10_000_000 },
  { id: 'krx-000660', marketId: 'korea-stock', symbol: '000660', name: 'SK hynix', marketType: 'kospi', providerType: 'mock-krx', quoteCurrency: 'KRW', lastPrice: 190_000, change24hPercent: -13, volume24h: 5_000_000 },
]
const unrelatedNews: NewsLoadResult = { requestedMode: 'local-proxy', state: 'local-proxy-ready', source: 'local-proxy', providerLabel: 'Local News Proxy', articles: [{ id: 'macro', category: 'macro', title: 'Federal Reserve Board update', source: 'Federal Reserve Board', publishedAt: '2026-01-01T00:00:00Z', relatedSymbols: [], relatedMarkets: ['macro'], sentiment: 'unassessed', importance: 'high', summary: 'Macro only', isMock: false }], lastUpdatedAt: '2026-01-01T00:00:00Z', error: null, fallback: false }

describe('stockWatchCandidateEngine', () => {
  it('is deterministic', () => expect(buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: null, language: 'en' })).toEqual(buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: null, language: 'en' })))
  it('labels mock stock data and creates safe planning text', () => {
    const candidate = buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: null, language: 'en' })[0]
    expect(candidate.dataQuality).toBe('mock')
    expect(candidate.planningZones.interestArea).toContain('Mock-data workflow')
  })
  it('does not create candidates when the requested catalog is unavailable', () => expect(buildStockWatchCandidates({ instruments: [], region: 'us', newsResult: null, language: 'en' })).toEqual([]))
  it('keeps news without explicit symbols at market scope and awards no news points', () => {
    const candidate = buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: unrelatedNews, language: 'en' })[0]
    expect(candidate.newsEvidence.scope).toBe('market')
    expect(candidate.evidence.find((item) => item.type === 'news')?.score).toBe(0)
  })
  it('does not invent fundamentals, valuation, earnings, or analyst ratings', () => {
    const result = JSON.stringify(buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: null, language: 'en' })).toLowerCase()
    expect(result).not.toMatch(/pe ratio|price-to-earnings|analyst rating|earnings forecast|revenue forecast/)
  })
  it('contains no unsafe action or return wording', () => expect(JSON.stringify(buildStockWatchCandidates({ instruments: korea, region: 'korea', newsResult: null, language: 'en' })).toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed|profit expected|ai recommends|recommendation|recommended/))
})
