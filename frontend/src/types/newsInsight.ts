import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'

export type NewsInsightImpactType = 'macro' | 'crypto' | 'koreaStock' | 'usStock' | 'sector' | 'regulation' | 'risk'
export type NewsInsightHorizon = 'short' | 'swing' | 'long'
export type NewsCandidateScope = 'instrument-specific' | 'market-level' | 'sector-level' | 'unavailable'
export type NewsInsightProviderMode = 'rule-based' | 'ai-disabled' | 'future-ai'

export interface NewsInsightCandidate {
  instrumentId: string
  symbol: string
  name?: string
}

export interface NewsInsightSummary {
  originalTitle: string
  source: string
  publishedAt: string
  providerMode: NewsInsightProviderMode
  language: Language
  koreanSummaryPlaceholder: string
  keyIssue: string
  marketImpact: string
  relatedImpactTypes: readonly NewsInsightImpactType[]
  relatedSectors: readonly string[]
  relatedMarkets: readonly string[]
  relatedCandidateSymbols: readonly string[]
  relatedCandidates: readonly NewsInsightCandidate[]
  candidateScope: NewsCandidateScope
  shortTermView: string
  swingView: string
  longTermView: string
  risks: readonly string[]
  caveats: readonly string[]
  sourceUrl?: string
  disclaimer: string
  isDemo: boolean
}

export type NewsInsightAvailableInstrument = Pick<MarketInstrument, 'id' | 'symbol' | 'name'>

