import type { SnapshotFreshness } from '@/types/candidateSnapshot'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type { PracticalDecisionState } from '@/types/practicalDecision'
import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'

export const DEFAULT_CANDIDATE_REVIEW_SCORE_THRESHOLD = 60

export type CandidateQualityGateReason = 'invalidPrice' | 'insufficientBasis' | 'unavailableScore' | 'belowThreshold' | 'insufficientData' | 'basisUnavailable'

export interface CandidateQualityGateInput {
  currentPrice: number
  practicalDecisionState: PracticalDecisionState
  reviewScore: CandidateReviewScore
  dataQuality: AnalysisDataQuality
  freshness: SnapshotFreshness
  missingEvidenceCount: number
  hasCautionState: boolean
}

export interface CandidateQualityGateDecision {
  passes: boolean
  reason: CandidateQualityGateReason | null
}

export interface CandidateQualityGateResult<T> {
  passing: readonly T[]
  excluded: readonly { item: T; reason: CandidateQualityGateReason }[]
  reasonCounts: Readonly<Partial<Record<CandidateQualityGateReason, number>>>
}

/**
 * Applies only evidence-quality boundaries. It does not create a new investment
 * score, use personal inputs, or reorder the surviving candidates.
 */
export function evaluateCandidateQualityGate(input: CandidateQualityGateInput, threshold = DEFAULT_CANDIDATE_REVIEW_SCORE_THRESHOLD): CandidateQualityGateDecision {
  if (!Number.isFinite(input.currentPrice) || input.currentPrice <= 0) return { passes: false, reason: 'invalidPrice' }
  if (input.dataQuality === 'unavailable') return { passes: false, reason: 'insufficientData' }
  if (input.freshness === 'priceUnavailable' || input.freshness === 'reviewBasisUnavailable') return { passes: false, reason: 'basisUnavailable' }
  if (input.practicalDecisionState === 'unavailable') return { passes: false, reason: 'insufficientBasis' }
  if (input.reviewScore.score === null || input.reviewScore.level === 'unavailable') return { passes: false, reason: 'unavailableScore' }
  if (input.reviewScore.score < threshold) return { passes: false, reason: 'belowThreshold' }
  return { passes: true, reason: null }
}

export function applyCandidateQualityGate<T>(items: readonly T[], inputFor: (item: T) => CandidateQualityGateInput, threshold = DEFAULT_CANDIDATE_REVIEW_SCORE_THRESHOLD): CandidateQualityGateResult<T> {
  const passing: T[] = []
  const excluded: { item: T; reason: CandidateQualityGateReason }[] = []
  const reasonCounts: Partial<Record<CandidateQualityGateReason, number>> = {}
  items.forEach((item) => {
    const decision = evaluateCandidateQualityGate(inputFor(item), threshold)
    if (decision.passes) passing.push(item)
    else if (decision.reason) {
      excluded.push({ item, reason: decision.reason })
      reasonCounts[decision.reason] = (reasonCounts[decision.reason] ?? 0) + 1
    }
  })
  return { passing, excluded, reasonCounts }
}
