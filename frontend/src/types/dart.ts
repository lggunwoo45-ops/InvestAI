export type DartDisclosureCategory = 'periodic' | 'material' | 'correction' | 'other'
export type DartDisclosureStatus = 'disabled' | 'unavailable' | 'mapping_unavailable' | 'loading' | 'ready' | 'error'
export type DartSourceMode = 'live' | 'mock' | 'disabled'

export interface DartDisclosure {
  id: string
  receiptNo: string
  corpCode: string
  stockCode: string
  corpName: string
  reportName: string
  submittedAt: string
  disclosureType: DartDisclosureCategory
  detailUrl: string | null
  source: 'OpenDART' | 'mock'
  isCorrection: boolean
  isMaterial: boolean
  isPeriodic: boolean
}

export interface DartDisclosureResult {
  status: DartDisclosureStatus
  disclosures: readonly DartDisclosure[]
  message: string
  fetchedAt: string | null
  sourceMode: DartSourceMode
}

export type DartDisclosureReviewStatus = 'no_data' | 'disabled' | 'mapping_unavailable' | 'no_recent_disclosures' | 'review_available' | 'review_needed'

export interface DartDisclosureCounts {
  total: number
  periodic: number
  material: number
  correction: number
  other: number
}

export interface DartDisclosureReview {
  status: DartDisclosureReviewStatus
  headline: string
  summary: string
  reviewPoints: readonly string[]
  caution: string
  counts: DartDisclosureCounts
  mostRecentSubmittedAt: string | null
  sourceMode: DartSourceMode
}
