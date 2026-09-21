import type { WatchCandidateHorizon } from './watchCandidate'

export type SimpleAssetType = 'crypto' | 'stock'
export type SimpleCandidateDataQuality = 'live' | 'mock' | 'limited' | 'unavailable'

export interface SimplePlanningLevel {
  label: string
  value: string
  note: string
}

export interface SimplePlanningReference {
  available: boolean
  reason: string
  observationArea: SimplePlanningLevel | null
  riskCheckArea: SimplePlanningLevel | null
  upsideCheckArea: SimplePlanningLevel | null
  notes: readonly string[]
}

export type SimpleAttentionBand = 'high' | 'medium' | 'low'

export interface SimpleCandidate {
  id: string
  instrumentId: string
  symbol: string
  name: string
  assetType: SimpleAssetType
  region: string
  score: number
  horizon: WatchCandidateHorizon
  dataQuality: SimpleCandidateDataQuality
  dataQualityNote: string
  simpleReason: string
  goodPoints: readonly string[]
  riskPoints: readonly string[]
  planningReference: SimplePlanningReference
  sourceCandidateId: string
}

export interface SimpleModeSummary {
  generatedAtLabel: string
  candidates: readonly SimpleCandidate[]
  limitations: readonly string[]
}
