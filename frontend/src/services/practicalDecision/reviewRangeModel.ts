import type { ReviewRange, ReviewRangeInput, ReviewRangeKind } from '@/types/practicalDecision'

const widths = { short: 0.012, swing: 0.03, long: 0.06 } as const
const copy = {
  en: { labels: { approachReviewRange: 'Approach review range', riskRecheckBasis: 'Risk re-check basis', profitProtectionReview: 'Profit protection review range', unavailable: 'Review range unavailable' }, description: 'Approximate area for structured review.', historical: 'Historical snapshot area for context only.', caution: 'This range is a decision-support review area, not an order price. The final decision belongs to the user.' },
  ko: { labels: { approachReviewRange: '접근 검토 범위', riskRecheckBasis: '위험 재확인 기준', profitProtectionReview: '수익 보호 검토 범위', unavailable: '검토 범위 생성 불가' }, description: '체계적인 확인을 위한 근사 검토 범위입니다.', historical: '과거 스냅샷 기준의 참고 범위입니다.', caution: '이 범위는 주문가가 아니라 판단 보조용 검토 범위입니다. 최종 판단은 사용자가 직접 해야 합니다.' },
} as const

export function buildReviewRanges(input: ReviewRangeInput): readonly ReviewRange[] {
  if (input.dataQuality !== 'live' || !Number.isFinite(input.anchorPrice) || input.anchorPrice <= 0) return []
  const width = widths[input.horizon]
  const source = input.expired ? 'historical-snapshot' : input.source
  const t = copy[input.language]
  const range = (kind: Exclude<ReviewRangeKind, 'unavailable'>, low: number, high: number): ReviewRange => ({ kind, label: t.labels[kind], lowPrice: input.anchorPrice * low, highPrice: input.anchorPrice * high, anchorPrice: input.anchorPrice, description: input.expired ? t.historical : t.description, caution: t.caution, source, isRangeApproximation: true })
  return [
    range('approachReviewRange', 1 - width, 1 + width / 2),
    range('riskRecheckBasis', 1 - width * 2, 1 - width),
    range('profitProtectionReview', 1 + width, 1 + width * 2),
  ]
}
