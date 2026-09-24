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
