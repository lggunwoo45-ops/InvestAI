import type { DartDisclosureCategory } from '@/types/dart'

const correctionTerms = /정정|기재정정|첨부정정/
const periodicTerms = /사업보고서|반기보고서|분기보고서/
const materialTerms = /주요사항보고서|유상증자|무상증자|전환사채|신주인수권부사채|회사합병|영업양수도|최대주주|소송|횡령|배임|상장폐지|거래정지/

/** Adds a neutral source-evidence label only; it never evaluates market impact. */
export function classifyDartDisclosure(reportName: string): DartDisclosureCategory {
  if (correctionTerms.test(reportName)) return 'correction'
  if (periodicTerms.test(reportName)) return 'periodic'
  if (materialTerms.test(reportName)) return 'material'
  return 'other'
}
