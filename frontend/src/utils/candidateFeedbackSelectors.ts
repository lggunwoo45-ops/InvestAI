import type { CandidateFeedbackMap, CandidateReviewFilter } from '@/types/candidateFeedback'
import type { WatchCandidate } from '@/types/watchCandidate'

/** Review filtering never mutates ranking or scoring. */
export function filterCandidatesByReviewStatus(candidates: readonly WatchCandidate[], feedback: CandidateFeedbackMap, filter: CandidateReviewFilter): readonly WatchCandidate[] {
  if (filter === 'all') return candidates
  return candidates.filter((candidate) => (feedback[candidate.instrumentId]?.status ?? 'unreviewed') === filter)
}
