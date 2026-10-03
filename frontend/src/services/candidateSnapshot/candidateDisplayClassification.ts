import type { CandidateQualityGateInput } from './candidateQualityGate'

export const CANDIDATE_DISPLAY_FILTER_STORAGE_KEY = 'market-copilot.candidateDisplayFilter.v1'
export const STANDARD_CANDIDATE_DISPLAY_THRESHOLD = 60
export const STRICT_CANDIDATE_DISPLAY_THRESHOLD = 70
export const HELD_FOR_REVIEW_MINIMUM_SCORE = 50

export type CandidateDisplayFilter = 'strict' | 'standard' | 'wider'
export type CandidateDisplayReason = 'reviewScoreTooLow' | 'reviewBasisInsufficient' | 'currentPriceUnavailable' | 'dataQualityInsufficient' | 'currentBasisUnavailable'

export interface CandidateDisplayEntry<T> {
  item: T
  reason: CandidateDisplayReason
}

export interface CandidateQualityStatusClassification<T> {
  displayed: readonly T[]
  heldForReview: readonly CandidateDisplayEntry<T>[]
  excluded: readonly CandidateDisplayEntry<T>[]
  heldReasonCounts: Readonly<Partial<Record<CandidateDisplayReason, number>>>
  excludedReasonCounts: Readonly<Partial<Record<CandidateDisplayReason, number>>>
}

const filters = new Set<CandidateDisplayFilter>(['strict', 'standard', 'wider'])
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function increment(counts: Partial<Record<CandidateDisplayReason, number>>, reason: CandidateDisplayReason) {
  counts[reason] = (counts[reason] ?? 0) + 1
}

function exclusionReason(input: CandidateQualityGateInput): CandidateDisplayReason | null {
  if (!Number.isFinite(input.currentPrice) || input.currentPrice <= 0 || input.freshness === 'priceUnavailable') return 'currentPriceUnavailable'
  if (input.dataQuality === 'unavailable') return 'dataQualityInsufficient'
  if (input.freshness === 'reviewBasisUnavailable') return 'currentBasisUnavailable'
  if (input.practicalDecisionState === 'unavailable') return 'reviewBasisInsufficient'
  if (input.reviewScore.score === null || input.reviewScore.level === 'unavailable') return 'reviewBasisInsufficient'
  if (input.reviewScore.score < HELD_FOR_REVIEW_MINIMUM_SCORE) return 'reviewScoreTooLow'
  return null
}

/**
 * Classifies already-computed candidates into stable quality statuses. The
 * status is independent of the user's display filter, preserves source order,
 * and never changes scoring, snapshot storage, or refresh logic.
 */
export function classifyCandidateQualityStatus<T>(
  items: readonly T[],
  inputFor: (item: T) => CandidateQualityGateInput,
): CandidateQualityStatusClassification<T> {
  const displayed: T[] = []
  const heldForReview: CandidateDisplayEntry<T>[] = []
  const excluded: CandidateDisplayEntry<T>[] = []
  const heldReasonCounts: Partial<Record<CandidateDisplayReason, number>> = {}
  const excludedReasonCounts: Partial<Record<CandidateDisplayReason, number>> = {}

  items.forEach((item) => {
    const input = inputFor(item)
    const hardExclusion = exclusionReason(input)
    if (hardExclusion) {
      excluded.push({ item, reason: hardExclusion })
      increment(excludedReasonCounts, hardExclusion)
      return
    }
    if (input.missingEvidenceCount > 0 || input.freshness === 'changeReview' || input.freshness === 'expired') {
      heldForReview.push({ item, reason: 'reviewBasisInsufficient' })
      increment(heldReasonCounts, 'reviewBasisInsufficient')
      return
    }
    if ((input.reviewScore.score ?? 0) < STANDARD_CANDIDATE_DISPLAY_THRESHOLD) {
      heldForReview.push({ item, reason: 'reviewScoreTooLow' })
      increment(heldReasonCounts, 'reviewScoreTooLow')
      return
    }
    displayed.push(item)
  })

  return { displayed, heldForReview, excluded, heldReasonCounts, excludedReasonCounts }
}

/** Applies a view preference only to candidates already classified as displayed. */
export function filterDisplayedCandidates<T>(items: readonly T[], inputFor: (item: T) => CandidateQualityGateInput, filter: CandidateDisplayFilter): readonly T[] {
  if (filter !== 'strict') return items
  return items.filter((item) => (inputFor(item).reviewScore.score ?? 0) >= STRICT_CANDIDATE_DISPLAY_THRESHOLD)
}

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>
type WriteStorage = Pick<Storage, 'setItem'>

export function loadCandidateDisplayFilter(storage?: ReadStorage): CandidateDisplayFilter {
  let target: ReadStorage | null = null
  try {
    target = storage ?? window.localStorage
    const raw = target.getItem(CANDIDATE_DISPLAY_FILTER_STORAGE_KEY)
    if (!raw) return 'standard'
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || parsed.schemaVersion !== 1 || !filters.has(parsed.filter as CandidateDisplayFilter)) throw new Error('invalid candidate display filter')
    return parsed.filter as CandidateDisplayFilter
  } catch {
    try { target?.removeItem(CANDIDATE_DISPLAY_FILTER_STORAGE_KEY) } catch { /* Recovery must not break the page. */ }
    return 'standard'
  }
}

export function saveCandidateDisplayFilter(filter: CandidateDisplayFilter, storage?: WriteStorage) {
  try { (storage ?? window.localStorage).setItem(CANDIDATE_DISPLAY_FILTER_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, filter })) } catch { /* Keep the in-memory selection usable. */ }
}
