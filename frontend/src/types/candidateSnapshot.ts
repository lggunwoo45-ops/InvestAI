import type { MarketInstrument } from '@/types/market'
import type { ActionReadinessStatus, ActionReadinessStrength, ActionRuleBasisItem, AnalysisDataQuality, MyAnalysisResult } from '@/types/myAnalysis'
import type { WatchCandidate } from '@/types/watchCandidate'

export type SnapshotFreshness = 'basisHeld' | 'changeReview' | 'expired' | 'unavailable'
export type CandidateSnapshotInterestStage = 'waiting' | 'first' | 'second' | 'third' | 'chaseCaution' | 'reboundCaution'

export interface CandidateSnapshotItem {
  instrumentId: string
  symbol: string
  displayName: string
  assetType: 'crypto' | 'stock'
  marketId: string
  quoteCurrency: string
  order: number
  basisPrice: number
  basisChange24hPercent: number
  basisVolume24h: number
  basisMovementBand: string
  interestStage: CandidateSnapshotInterestStage
  actionStatus: ActionReadinessStatus
  clarity: ActionReadinessStrength
  reasonText: string
  ruleBasis: readonly ActionRuleBasisItem[]
  dataQuality: AnalysisDataQuality
  newsState: string
  disclosureCount: number
  latestDisclosureAt: string | null
}

export interface CandidateSnapshot {
  schemaVersion: 1
  snapshotId: string
  generatedAt: string
  expiresAt: string
  engineVersion: string
  catalogSource: string
  providerLabel: string
  items: readonly CandidateSnapshotItem[]
}

export interface CandidateSnapshotBuildSource {
  candidate: WatchCandidate
  instrument: MarketInstrument
  analysis: MyAnalysisResult
  disclosureCount?: number
  latestDisclosureAt?: string | null
}

export interface CandidateSnapshotCurrentState {
  instrumentId: string
  currentPrice: number
  interestStage: CandidateSnapshotInterestStage
  actionStatus: ActionReadinessStatus
  clarity: ActionReadinessStrength
  ruleBasis: readonly ActionRuleBasisItem[]
  dataQuality: AnalysisDataQuality
}

export interface CandidateSnapshotChange {
  field: 'ruleBasis' | 'interestStage' | 'actionStatus' | 'dataQuality'
  previousValue: string
  currentValue: string
}

export interface CandidateSnapshotFreshnessResult {
  state: SnapshotFreshness
  changes: readonly CandidateSnapshotChange[]
}
