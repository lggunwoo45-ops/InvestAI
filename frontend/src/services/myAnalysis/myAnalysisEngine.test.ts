import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { buildMyInstrumentAnalysis } from './myAnalysisEngine'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', providerSymbol: 'KRW-BTC', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }
const stock: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', providerSymbol: '005930', symbol: '005930', name: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 1_000_000 }

describe('buildMyInstrumentAnalysis', () => {
  it('is deterministic and keeps simple sections to three items', () => {
    const input = { instrument: crypto, intent: 'watching' as const, displayMode: 'simple' as const, userNote: '', averagePrice: null, catalogSource: 'live' as const, newsResult: null, language: 'en' as const }
    const first = buildMyInstrumentAnalysis(input)
    expect(buildMyInstrumentAnalysis(input)).toEqual(first)
    expect(first.dataQuality).toBe('live')
    expect(first.simpleModeSections.every((section) => section.items.length <= 3)).toBe(true)
    expect(first.missingEvidence.some((entry) => entry.type === 'news')).toBe(true)
  })

  it('labels mock stock movement as demo context and exposes future evidence gaps', () => {
    const result = buildMyInstrumentAnalysis({ instrument: stock, intent: 'holding', displayMode: 'expert', userNote: 'Review after earnings', averagePrice: 68_000, catalogSource: 'mock', newsResult: null, language: 'en' })
    expect(result.dataQuality).toBe('mock')
    expect(result.evidence.find((entry) => entry.type === 'change')?.level).toBe('demo')
    expect(result.missingEvidence.map((entry) => entry.type)).toEqual(expect.arrayContaining(['filing', 'earnings', 'fundamentals', 'ratings']))
    expect(result.evidence.filter((entry) => entry.type === 'user-note')).toHaveLength(2)
    expect(JSON.stringify(result)).not.toMatch(/target price|buy now|sell now/i)
  })

  it('uses only explicitly related real news as instrument evidence', () => {
    const newsResult = { requestedMode: 'rss-ready' as const, state: 'rss-ready' as const, source: 'rss' as const, providerLabel: 'Test RSS', lastUpdatedAt: null, error: null, fallback: false, articles: [{ id: 'n1', title: 'Bitcoin update', summary: 'Source report', source: 'Test', publishedAt: '2026-01-01T00:00:00Z', relatedSymbols: ['BTC'], relatedMarkets: ['crypto' as const], category: 'crypto' as const, sentiment: 'unassessed' as const, importance: 'unassessed' as const, isMock: false }] }
    const result = buildMyInstrumentAnalysis({ instrument: crypto, intent: 'shortTerm', displayMode: 'expert', userNote: '', averagePrice: null, catalogSource: 'live', newsResult, language: 'en' })
    expect(result.evidence.find((entry) => entry.type === 'news')?.detail).toContain('Explicitly related')
    expect(result.missingEvidence.some((entry) => entry.type === 'news')).toBe(false)
  })
})
