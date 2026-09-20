import { describe, expect, it } from 'vitest'

import { newsArticles } from '@/services/dashboard/mockDashboardData'
import type { NewsArticle } from '@/types/dashboard'
import type { NewsInsightAvailableInstrument } from '@/types/newsInsight'
import { buildNewsInsight } from './newsInsightEngine'

const available: readonly NewsInsightAvailableInstrument[] = [
  { id: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin' },
  { id: 'upbit-eth', symbol: 'ETH/KRW', name: 'Ethereum' },
  { id: 'us-nvda', symbol: 'NVDA', name: 'NVIDIA' },
  { id: 'us-aapl', symbol: 'AAPL', name: 'Apple' },
]

const macro: NewsArticle = { id: 'fed', category: 'macro', title: 'Federal Reserve publishes policy statement', source: 'Federal Reserve', publishedAt: '2026-01-01T00:00:00Z', relatedSymbols: [], relatedMarkets: ['macro', 'us'], sentiment: 'neutral', importance: 'high', summary: 'Official source.', url: 'https://federalreserve.gov/example', isMock: false }

describe('newsInsightEngine', () => {
  it('is deterministic', () => expect(buildNewsInsight({ article: macro, availableInstruments: available, language: 'en' })).toEqual(buildNewsInsight({ article: macro, availableInstruments: available, language: 'en' })))
  it('keeps macro Local Proxy-style news market-level and non-instrument-specific', () => {
    const insight = buildNewsInsight({ article: macro, availableInstruments: available, language: 'en' })
    expect(insight.candidateScope).toBe('market-level')
    expect(insight.relatedCandidateSymbols).toEqual(['BTC/KRW', 'ETH/KRW'])
    expect(insight.marketImpact).toContain('not an instrument-specific signal')
  })
  it('marks mock input as a demo insight', () => expect(buildNewsInsight({ article: newsArticles[0], availableInstruments: available, language: 'en' }).isDemo).toBe(true))
  it('links only explicitly related instruments for non-macro news', () => {
    const insight = buildNewsInsight({ article: newsArticles[2], availableInstruments: available, language: 'en' })
    expect(insight.relatedCandidateSymbols).toEqual(['NVDA'])
    expect(insight.relatedCandidateSymbols).not.toContain('AAPL')
  })
  it('preserves the original title and labels Korean copy as a rule-based placeholder', () => {
    const insight = buildNewsInsight({ article: macro, availableInstruments: available, language: 'ko' })
    expect(insight.originalTitle).toBe(macro.title)
    expect(insight.koreanSummaryPlaceholder).toContain('규칙 기반')
    expect(insight.koreanSummaryPlaceholder).toContain('AI 한국어 요약은 아직 연결되지 않았습니다')
  })
  it('does not use unsafe recommendation wording', () => {
    const text = JSON.stringify(buildNewsInsight({ article: macro, availableInstruments: available, language: 'en' })).toLowerCase()
    expect(text).not.toMatch(/guaranteed|guarantee profit|must buy|must sell/)
  })
})
