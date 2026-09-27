import type { Language } from '@/i18n/translations'
import type { SnapshotFreshness } from '@/types/candidateSnapshot'
import type { ActionReadinessStrength, AnalysisDataQuality } from '@/types/myAnalysis'
import type { PracticalDecisionState } from '@/types/practicalDecision'

export type CandidateReviewScoreLevel = 'low' | 'moderate' | 'strong' | 'unavailable'

export interface CandidateReviewScore {
  score: number | null
  level: CandidateReviewScoreLevel
  label: string
  summary: string
  factors: readonly string[]
  cautions: readonly string[]
}

export interface CandidateReviewScoreInput {
  language: Language
  dataQuality: AnalysisDataQuality
  practicalDecisionState: PracticalDecisionState
  clarity: ActionReadinessStrength
  hasReviewRanges: boolean
  freshness?: SnapshotFreshness | null
  evidenceCount: number
  missingEvidenceCount: number
  hasNewsEvidence: boolean
  hasDisclosureEvidence: boolean
}

const qualityPoints: Record<AnalysisDataQuality, number> = { live: 45, limited: 25, mock: 20, unavailable: 0 }
const decisionPoints: Record<PracticalDecisionState, number> = { wait: 0, watch: 10, approachReview: 20, extendedCaution: 5, postDropReview: 5, changeCheck: 0, holdingRecheck: 5, unavailable: 0 }
const clarityPoints: Record<ActionReadinessStrength, number> = { low: 0, medium: 8, high: 14 }

const copy = {
  en: {
    labels: { low: 'Low', moderate: 'Moderate', strong: 'Strong', unavailable: 'Unavailable' },
    summaries: { low: 'Limited evidence is aligned for review.', moderate: 'Several review factors are available.', strong: 'Multiple current review factors are aligned.', unavailable: 'There is not enough review basis to calculate a score.' },
    factors: { quality: 'Data quality is included.', decision: 'Current review state is included.', clarity: 'Signal clarity is included.', ranges: 'Review ranges are available.', evidence: 'Loaded evidence is included.', news: 'News evidence is available.', disclosure: 'Disclosure evidence is available.' },
    cautions: { mock: 'Mock/demo data limits action readiness.', expired: 'The saved basis is expired.', missingBasis: 'The current review basis is unavailable.', movement: 'Expanded movement requires additional caution.', missing: 'Some evidence is missing.' },
  },
  ko: {
    labels: { low: '낮음', moderate: '보통', strong: '높음', unavailable: '산정 불가' },
    summaries: { low: '검토에 활용할 근거가 제한적입니다.', moderate: '여러 검토 요소를 확인할 수 있습니다.', strong: '현재 여러 검토 요소가 함께 확인됩니다.', unavailable: '점수를 산정할 검토 기준이 충분하지 않습니다.' },
    factors: { quality: '데이터 품질을 반영했습니다.', decision: '현재 판단 상태를 반영했습니다.', clarity: '판단 명확도를 반영했습니다.', ranges: '검토 범위를 확인할 수 있습니다.', evidence: '불러온 근거를 반영했습니다.', news: '뉴스 근거를 확인할 수 있습니다.', disclosure: '공시 근거를 확인할 수 있습니다.' },
    cautions: { mock: '모의/데모 데이터는 실행 판단을 제한합니다.', expired: '저장된 기준 시점이 만료되었습니다.', missingBasis: '현재 판단 근거를 확인할 수 없습니다.', movement: '확대된 움직임은 추가 주의가 필요합니다.', missing: '일부 근거가 부족합니다.' },
  },
} as const

export function clampCandidateReviewScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function unavailable(language: Language): CandidateReviewScore {
  const t = copy[language]
  return { score: null, level: 'unavailable', label: t.labels.unavailable, summary: t.summaries.unavailable, factors: [], cautions: [t.cautions.missingBasis] }
}

/**
 * Builds a conservative review aid from already-loaded evidence. The model never
 * reads user notes, average price, future performance, or execution information.
 */
export function buildCandidateReviewScore(input: CandidateReviewScoreInput): CandidateReviewScore {
  if (input.dataQuality === 'unavailable' || input.freshness === 'priceUnavailable' || input.evidenceCount <= 0) return unavailable(input.language)

  const t = copy[input.language]
  const factors: string[] = [t.factors.quality, t.factors.decision, t.factors.clarity]
  const cautions: string[] = []
  let score = qualityPoints[input.dataQuality] + decisionPoints[input.practicalDecisionState] + clarityPoints[input.clarity]

  if (input.hasReviewRanges) {
    score += 5
    factors.push(t.factors.ranges)
  }
  score += Math.min(5, Math.max(0, input.evidenceCount)) * 3
  factors.push(t.factors.evidence)
  score -= Math.min(5, Math.max(0, input.missingEvidenceCount)) * 4
  if (input.missingEvidenceCount > 0) cautions.push(t.cautions.missing)
  if (input.hasNewsEvidence) {
    score += 3
    factors.push(t.factors.news)
  }
  if (input.hasDisclosureEvidence) {
    score += 3
    factors.push(t.factors.disclosure)
  }

  if (input.dataQuality === 'mock') {
    score = Math.min(score, 40)
    cautions.push(t.cautions.mock)
  }
  if (input.freshness === 'expired') {
    score = Math.min(score, 60)
    cautions.push(t.cautions.expired)
  }
  if (input.freshness === 'reviewBasisUnavailable') {
    score = Math.min(score, 50)
    cautions.push(t.cautions.missingBasis)
  }
  if (input.practicalDecisionState === 'extendedCaution' || input.practicalDecisionState === 'postDropReview') {
    score = Math.min(score, 70)
    cautions.push(t.cautions.movement)
  }

  const normalized = clampCandidateReviewScore(score)
  const level: CandidateReviewScoreLevel = normalized < 45 ? 'low' : normalized < 75 ? 'moderate' : 'strong'
  return { score: normalized, level, label: t.labels[level], summary: t.summaries[level], factors, cautions }
}
