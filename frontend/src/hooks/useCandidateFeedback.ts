import { useCallback, useState } from 'react'

import type { CandidateFeedbackMap, CandidateReviewStatus } from '@/types/candidateFeedback'
import { CANDIDATE_NOTE_MAX_LENGTH, clearCandidateFeedback, loadCandidateFeedback, saveCandidateFeedback } from '@/utils/candidateFeedbackStorage'

const emptyFeedback = (instrumentId: string) => ({ instrumentId, status: 'unreviewed' as const, note: '', updatedAt: new Date().toISOString() })

/** Local-only review workflow. No network, account, analytics, or sync boundary exists here. */
export function useCandidateFeedback() {
  const [feedback, setFeedback] = useState<CandidateFeedbackMap>(loadCandidateFeedback)
  const update = useCallback((instrumentId: string, values: Partial<{ status: CandidateReviewStatus; note: string }>) => {
    setFeedback((current) => {
      const previous = current[instrumentId] ?? emptyFeedback(instrumentId)
      const nextItem = { ...previous, ...values, note: values.note?.slice(0, CANDIDATE_NOTE_MAX_LENGTH) ?? previous.note, updatedAt: new Date().toISOString() }
      const next = { ...current, [instrumentId]: nextItem }
      saveCandidateFeedback(next)
      return next
    })
  }, [])
  const resetStatus = useCallback((instrumentId: string) => update(instrumentId, { status: 'unreviewed' }), [update])
  const resetAll = useCallback(() => { clearCandidateFeedback(); setFeedback({}) }, [])
  return { feedback, setStatus: (id: string, status: CandidateReviewStatus) => update(id, { status }), setNote: (id: string, note: string) => update(id, { note }), resetStatus, resetAll }
}
