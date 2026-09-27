import type { Language } from '@/i18n/translations'
import type { SnapshotFreshness, CandidateSnapshotInterestStage } from '@/types/candidateSnapshot'
import type { ActionReadinessStatus, AnalysisDataQuality } from '@/types/myAnalysis'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'

export type PracticalDecisionState = 'wait' | 'watch' | 'approachReview' | 'extendedCaution' | 'postDropReview' | 'changeCheck' | 'holdingRecheck' | 'unavailable'
export type PracticalDecisionSource = 'analysis' | 'snapshot'

export interface PracticalDecisionResult {
  state: PracticalDecisionState
  title: string
  summary: string
  reason: string
  nextCheck: string
  caution: string
  source: PracticalDecisionSource
  horizon: WatchCandidateHorizon
  dataQuality: AnalysisDataQuality
}

export interface PracticalDecisionInput {
  language: Language
  horizon: WatchCandidateHorizon
  dataQuality: AnalysisDataQuality
  actionStatus: ActionReadinessStatus
  interestStage?: CandidateSnapshotInterestStage
  freshness?: SnapshotFreshness | null
  movementBand?: string | null
  hasAveragePrice?: boolean
  source: PracticalDecisionSource
  reason?: string
  nextCheck?: string
}

export type ReviewRangeKind = 'approachReviewRange' | 'riskRecheckBasis' | 'profitProtectionReview' | 'unavailable'

export interface ReviewRange {
  kind: ReviewRangeKind
  label: string
  lowPrice: number | null
  highPrice: number | null
  anchorPrice: number | null
  description: string
  caution: string
  source: 'current' | 'snapshot' | 'historical-snapshot'
  isRangeApproximation: boolean
}

export interface ReviewRangeInput {
  language: Language
  horizon: WatchCandidateHorizon
  dataQuality: AnalysisDataQuality
  anchorPrice: number
  source: 'current' | 'snapshot'
  expired?: boolean
}
