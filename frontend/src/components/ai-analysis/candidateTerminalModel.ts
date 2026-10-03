import type { Language } from '@/i18n/translations'
import { buildCandidateReviewScore, type CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import { evaluateCandidateSnapshotFreshness } from '@/services/candidateSnapshot/candidateSnapshotFreshness'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import type { CandidateSnapshotChange, CandidateSnapshotCurrentState, CandidateSnapshotItem, SnapshotFreshness } from '@/types/candidateSnapshot'
import type { PracticalDecisionResult, ReviewRange } from '@/types/practicalDecision'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'

export interface CandidateTerminalItem {
  item: CandidateSnapshotItem
  currentPrice: number | null
  changeSinceBasis: number | null
  freshness: SnapshotFreshness
  freshnessChanges: readonly CandidateSnapshotChange[]
  practicalDecision: PracticalDecisionResult
  reviewScore: CandidateReviewScore
  reviewRanges: readonly ReviewRange[]
}

interface BuildCandidateTerminalItemsInput {
  items: readonly CandidateSnapshotItem[]
  expiresAt: string
  currentStates: ReadonlyMap<string, CandidateSnapshotCurrentState>
  currentPrices: ReadonlyMap<string, number>
  horizon: WatchCandidateHorizon
  language: Language
  now: string
}

export function buildCandidateTerminalItems(input: BuildCandidateTerminalItemsInput): readonly CandidateTerminalItem[] {
  return [...input.items].sort((left, right) => left.order - right.order).slice(0, 5).map((item) => {
    const current = input.currentStates.get(item.instrumentId) ?? null
    const statePrice = current?.currentPrice ?? null
    const referencePrice = input.currentPrices.get(item.instrumentId) ?? null
    const currentPrice = statePrice !== null && Number.isFinite(statePrice) && statePrice > 0 ? statePrice
      : referencePrice !== null && Number.isFinite(referencePrice) && referencePrice > 0 ? referencePrice : null
    const freshness = evaluateCandidateSnapshotFreshness(item, current, input.expiresAt, input.now, currentPrice)
    const practicalDecision = buildPracticalDecision({ language: input.language, horizon: input.horizon, dataQuality: item.dataQuality, actionStatus: item.actionStatus, interestStage: item.interestStage, freshness: freshness.state, movementBand: item.basisMovementBand, source: 'snapshot', reason: item.reasonText })
    const reviewRanges = buildReviewRanges({ language: input.language, horizon: input.horizon, dataQuality: item.dataQuality, anchorPrice: item.basisPrice, source: 'snapshot', expired: freshness.state === 'expired' })
    const newsState = item.newsState.toLocaleLowerCase()
    const missingEvidenceCount = (newsState.includes('unavailable') || newsState.includes('not available') || newsState.includes('없음') ? 1 : 0) + (freshness.state === 'reviewBasisUnavailable' ? 1 : 0)
    const reviewScore = buildCandidateReviewScore({ language: input.language, dataQuality: item.dataQuality, practicalDecisionState: practicalDecision.state, clarity: item.clarity, hasReviewRanges: reviewRanges.length > 0, freshness: freshness.state, evidenceCount: item.ruleBasis.length + (item.disclosureCount > 0 ? 1 : 0), missingEvidenceCount, hasNewsEvidence: !newsState.includes('unavailable') && !newsState.includes('not available') && !newsState.includes('없음'), hasDisclosureEvidence: item.disclosureCount > 0 })
    return { item, currentPrice, changeSinceBasis: currentPrice === null ? null : currentPrice - item.basisPrice, freshness: freshness.state, freshnessChanges: freshness.changes, practicalDecision, reviewScore, reviewRanges }
  })
}
