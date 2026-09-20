import { describe, expect, it } from 'vitest'

import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import type { NewsArticle } from '@/types/dashboard'
import { buildMarketRadar } from './marketRadarEngine'

const instruments: readonly MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 1_000 },
  { id: 'upbit-eth', marketId: 'upbit', symbol: 'ETH/KRW', name: 'Ethereum', quoteCurrency: 'KRW', lastPrice: 50, change24hPercent: -12, volume24h: 500 },
]
const macro: NewsArticle = { id: 'fed', category: 'macro', title: 'Federal Reserve Board policy update', source: 'Federal Reserve Board', publishedAt: '2026-01-01T00:00:00Z', relatedSymbols: [], relatedMarkets: ['macro'], sentiment: 'unassessed', importance: 'high', summary: 'Policy update', isMock: false }
const newsResult: NewsLoadResult = { requestedMode: 'local-proxy', state: 'local-proxy-ready', source: 'local-proxy', providerLabel: 'Local News Proxy', articles: [macro], lastUpdatedAt: '2026-01-01T00:00:00Z', error: null, fallback: false }
const build = () => {
  const candidates = buildCryptoWatchCandidates({ instruments, newsResult, language: 'en' })
  return buildMarketRadar({ instruments, watchCandidates: candidates, newsResult, language: 'en', mode: 'mock', generatedAt: '2026-01-01T00:00:00.000Z' })
}

describe('marketRadarEngine', () => {
  it('is deterministic', () => expect(build()).toEqual(build()))
  it('creates unusual-volume signals from mocked instruments without implying direction', () => {
    const signal = build().unusualVolume[0]
    expect(signal.relatedSymbols).toEqual(['BTC/KRW'])
    expect(signal.summary).toContain('does not imply price direction')
  })
  it('marks extreme movement as a volatility caution', () => expect(build().volatilityRadar.find((item) => item.title === 'ETH/KRW')?.status).toBe('caution'))
  it('keeps Local Proxy macro news market-level and without a direct instrument', () => {
    const theme = build().newsThemes[0]
    expect(theme.scope).toBe('macro')
    expect(theme.relatedInstrumentIds).toEqual([])
    expect(theme.summary).toContain('market-level context')
  })
  it('renders a safe incomplete snapshot with no inputs', () => {
    const snapshot = buildMarketRadar({ instruments: [], watchCandidates: [], newsResult: null, language: 'ko', mode: 'live' })
    expect(snapshot.signals.some((signal) => signal.status === 'incomplete')).toBe(true)
    expect(snapshot.riskNotes).toContain('시장 데이터가 없어 레이더가 불완전합니다.')
    expect(snapshot.riskNotes.some((note) => note.includes('주식 후보 베타'))).toBe(true)
  })
  it('contains no unsafe action, return, or recommendation wording', () => expect(JSON.stringify(build()).toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed|profit expected|ai recommends|recommendation|recommended/))
})
