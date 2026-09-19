import { describe, expect, it } from 'vitest'

import type { NewsLoadResult } from '@/services/news/newsService'
import type { NewsArticle } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'
import { buildCryptoWatchCandidates } from './cryptoWatchCandidateEngine'

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 3, volume24h: 1_000 },
  { id: 'upbit-eth', marketId: 'upbit', symbol: 'ETH/KRW', name: 'Ethereum', quoteCurrency: 'KRW', lastPrice: 50, change24hPercent: 5, volume24h: 900 },
  { id: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', quoteCurrency: 'KRW', lastPrice: 1, change24hPercent: -1, volume24h: 200 },
  { id: 'upbit-risk', marketId: 'upbit', symbol: 'RISK/KRW', name: 'Risk', quoteCurrency: 'KRW', lastPrice: 2, change24hPercent: 22, volume24h: 950 },
  { id: 'binance-sol', marketId: 'binance-spot', symbol: 'SOLUSDT', name: 'Solana', quoteCurrency: 'USDT', lastPrice: 140, change24hPercent: 4, volume24h: 800 },
]

const realArticle: NewsArticle = { id: 'real', category: 'crypto', title: 'Bitcoin liquidity update', source: 'Official RSS', publishedAt: '2026-01-01', relatedSymbols: ['BTC'], relatedMarkets: ['crypto'], sentiment: 'unassessed', importance: 'unassessed', summary: 'Market update.', isMock: false }
const result = (source: NewsLoadResult['source'], articles: readonly NewsArticle[]): NewsLoadResult => ({ requestedMode: source === 'local-proxy' ? 'local-proxy' : source === 'rss' ? 'rss-ready' : 'mock', state: source === 'local-proxy' ? 'local-proxy-ready' : source === 'rss' ? 'rss-ready' : 'mock', source, providerLabel: 'Test', articles, lastUpdatedAt: null, error: null, fallback: false })

describe('cryptoWatchCandidateEngine', () => {
  it('is deterministic, bounded, and limited to the requested count', () => {
    const input = { instruments, newsResult: null, language: 'en' as const, limit: 3 }
    const first = buildCryptoWatchCandidates(input)
    const second = buildCryptoWatchCandidates(input)
    expect(first).toEqual(second)
    expect(first).toHaveLength(3)
    expect(first.every((item) => item.watchScore >= 0 && item.watchScore <= 100)).toBe(true)
  })

  it('rewards healthy momentum and volume while penalizing extreme movement', () => {
    const candidates = buildCryptoWatchCandidates({ instruments, newsResult: null, language: 'en', limit: 10 })
    const eth = candidates.find((item) => item.instrumentId === 'upbit-eth')!
    const xrp = candidates.find((item) => item.instrumentId === 'upbit-xrp')!
    const risky = candidates.find((item) => item.instrumentId === 'upbit-risk')!
    expect(eth.watchScore).toBeGreaterThan(xrp.watchScore)
    expect(risky.evidence.find((item) => item.type === 'risk')?.score).toBe(-20)
    expect(risky.watchScore).toBeLessThan(eth.watchScore)
  })

  it('keeps local proxy market news separate from coin-specific evidence', () => {
    const macro = { ...realArticle, id: 'macro', title: 'Federal Reserve policy update', relatedSymbols: [], relatedMarkets: ['macro'] as const }
    const candidate = buildCryptoWatchCandidates({ instruments, newsResult: result('local-proxy', [macro]), language: 'en' })[0]
    expect(candidate.newsEvidence).toMatchObject({ source: 'local-proxy', scope: 'market' })
    expect(candidate.newsEvidence.disclaimer).toContain('cannot be treated as coin-specific')
  })

  it('marks direct real RSS links as instrument evidence and mock news as demo only', () => {
    const direct = buildCryptoWatchCandidates({ instruments, newsResult: result('rss', [realArticle]), language: 'en', limit: 10 }).find((item) => item.instrumentId === 'upbit-btc')!
    expect(direct.newsEvidence).toMatchObject({ source: 'browser-rss', scope: 'instrument', count: 1 })
    const demoArticle = { ...realArticle, id: 'demo', isMock: true }
    const demo = buildCryptoWatchCandidates({ instruments, newsResult: result('mock', [demoArticle]), language: 'en' })[0]
    expect(demo.newsEvidence).toMatchObject({ source: 'demo', scope: 'demo' })
    expect(demo.newsEvidence.disclaimer).toContain('illustrative')
  })

  it('does not emit unsafe recommendation or certainty wording', () => {
    const text = JSON.stringify(buildCryptoWatchCandidates({ instruments, newsResult: null, language: 'en' })).toLowerCase()
    expect(text).not.toMatch(/\b(buy|sell|guaranteed|certain profit)\b/)
    expect(text).toContain('not a recommendation')
  })
})
