import type { MarketInstrument } from '@/types/market'

export type AnalysisIntent = 'watching' | 'holding' | 'longTerm' | 'swing' | 'shortTerm'
export type AnalysisAssetType = 'crypto' | 'stock'
export type AnalysisDataQuality = 'live' | 'mock' | 'limited' | 'unavailable'
export type AnalysisEvidenceType = 'price' | 'change' | 'volume' | 'candidate' | 'news' | 'market' | 'filing' | 'earnings' | 'fundamentals' | 'ratings'
export type AnalysisSignalLevel = 'available' | 'context' | 'missing' | 'demo'
export type MyAnalysisSectionId = 'simple-current' | 'simple-check' | 'simple-caution' | 'evidence' | 'missing' | 'checklist'
export type ActionReadinessStatus = 'decisionPending' | 'waiting' | 'watchZone' | 'conditionalApproach' | 'stagedApproach' | 'chaseCaution' | 'sharpDropReboundCaution' | 'invalidationCheck' | 'profitProtectionReview'
export type ActionReadinessStrength = 'low' | 'medium' | 'high'

export interface ActionReadinessZone {
  id: string
  label: string
  description: string
  distanceLabel: string
  note: string
}

export interface ActionReadinessPlan {
  status: ActionReadinessStatus
  strength: ActionReadinessStrength
  title: string
  summary: string
  whyThisStatus: string
  approachConditions: readonly string[]
  avoidConditions: readonly string[]
  nextChecks: readonly string[]
  zones: readonly ActionReadinessZone[]
  disclaimer: string
}

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
  reviewMeaning: string
}

export interface MyAnalysisSection {
  id: MyAnalysisSectionId
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
  currentRead: string
  evidence: readonly MyAnalysisEvidence[]
  missingEvidence: readonly MyAnalysisEvidence[]
  userContext: MyAnalysisUserContext
  simpleModeSections: readonly MyAnalysisSection[]
  expertModeSections: readonly MyAnalysisSection[]
  reviewChecklist: readonly string[]
  actionReadiness: ActionReadinessPlan
  disclaimer: string
}
