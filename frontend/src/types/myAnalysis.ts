import type { MarketInstrument } from '@/types/market'

export type AnalysisIntent = 'watching' | 'holding' | 'longTerm' | 'swing' | 'shortTerm'
export type AnalysisAssetType = 'crypto' | 'stock'
export type AnalysisDataQuality = 'live' | 'mock' | 'limited' | 'unavailable'
export type AnalysisEvidenceType = 'price' | 'change' | 'volume' | 'candidate' | 'news' | 'market' | 'filing' | 'earnings' | 'fundamentals' | 'ratings'
export type AnalysisSignalLevel = 'available' | 'context' | 'missing' | 'demo'

export interface MyAnalysisInput {
  instrument: MarketInstrument
  intent: AnalysisIntent
  userNote: string
  averagePrice: number | null
}

export interface MyAnalysisEvidence {
  id: string
  type: AnalysisEvidenceType
  label: string
  detail: string
  level: AnalysisSignalLevel
  source: string
}

export interface MyAnalysisSection {
  title: string
  items: readonly string[]
}

export interface MyAnalysisUserContext {
  intent: string
  userNote: string | null
  averagePrice: string | null
  notice: string
  intentNotice: string
}

export interface MyAnalysisResult {
  instrumentId: string
  assetType: AnalysisAssetType
  dataQuality: AnalysisDataQuality
  dataQualityLabel: string
  summary: string
  evidence: readonly MyAnalysisEvidence[]
  missingEvidence: readonly MyAnalysisEvidence[]
  userContext: MyAnalysisUserContext
  simpleModeSections: readonly MyAnalysisSection[]
  expertModeSections: readonly MyAnalysisSection[]
  disclaimer: string
}
