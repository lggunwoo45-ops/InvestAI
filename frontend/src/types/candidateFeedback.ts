export type CandidateReviewStatus = 'unreviewed' | 'watching' | 'reviewed' | 'dismissed'
export type CandidateReviewFilter = 'all' | CandidateReviewStatus

export interface CandidateFeedback {
  instrumentId: string
  status: CandidateReviewStatus
  note: string
  updatedAt: string
}

export type CandidateFeedbackMap = Readonly<Record<string, CandidateFeedback>>
