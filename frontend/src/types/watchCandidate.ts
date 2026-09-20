export type WatchCandidateAssetType = 'crypto' | 'stock'
export type WatchCandidateEvidenceType = 'momentum' | 'volume' | 'liquidity' | 'sector' | 'marketContext' | 'news' | 'risk' | 'scenario' | 'incomplete'
export type StockCandidateEvidenceType = 'momentum' | 'liquidity' | 'sector' | 'news' | 'marketContext' | 'risk' | 'incomplete'
export type StockMarketRegion = 'korea' | 'us'
export type StockCandidateDataQuality = 'live' | 'mock' | 'limited' | 'unavailable'
export type WatchCandidateEvidenceStatus = 'positive' | 'neutral' | 'risk' | 'missing' | 'demo'
export type WatchCandidateScoreLabel = 'high' | 'medium' | 'low' | 'incomplete'
export type WatchCandidateNewsSource = 'demo' | 'local-proxy' | 'browser-rss' | 'none'
export type WatchCandidateNewsScope = 'instrument' | 'market' | 'demo' | 'none'
export type WatchCandidateHorizon = 'short' | 'swing' | 'long'
export type WatchCandidateLifecycleStatus = 'new' | 'maintained' | 'strengthened' | 'weakened' | 'review-needed'

export interface CandidatePlanningZones {
  interestArea: string
  secondInterestArea: string
  targetObservationArea: string
  invalidationRiskArea: string
  riskRewardNote: string
  confidenceNote: string
}

export interface CandidateHorizonProfile {
  horizon: WatchCandidateHorizon
  label: string
  description: string
  reviewCadence: string
  evidenceFocus: readonly string[]
  scoreAdjustmentNote: string
}

export interface WatchCandidateBreakdown {
  type: WatchCandidateEvidenceType
  label: string
  score: number
  maxScore: number
  summary: string
  status: WatchCandidateEvidenceStatus
}

export interface WatchCandidateNewsEvidence {
  source: WatchCandidateNewsSource
  scope: WatchCandidateNewsScope
  count: number
  headlines: readonly string[]
  generated: boolean
  disclaimer: string
}

export interface WatchCandidate {
  id: string
  instrumentId: string
  symbol: string
  name: string
  assetType: WatchCandidateAssetType
  horizon: WatchCandidateHorizon
  lifecycleStatus: WatchCandidateLifecycleStatus
  reviewCadence: string
  planningZones: CandidatePlanningZones
  rank: number
  watchScore: number
  scoreLabel: WatchCandidateScoreLabel
  summary: string
  watchReason: string
  evidence: readonly WatchCandidateBreakdown[]
  riskSummary: string
  invalidationSummary: string
  nextWatchPoints: readonly string[]
  newsEvidence: WatchCandidateNewsEvidence
  disclaimer: string
}

export interface StockWatchCandidate extends WatchCandidate {
  assetType: 'stock'
  region: StockMarketRegion
  sectorLabel?: string
  dataQuality: StockCandidateDataQuality
  dataQualityNote: string
  stockEvidenceTypes: readonly StockCandidateEvidenceType[]
}
