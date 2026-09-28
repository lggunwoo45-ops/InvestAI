import type { Language } from '@/i18n/translations'
import type { CandidateQualityGateReason } from '@/services/candidateSnapshot/candidateQualityGate'
import styles from './MarketBucketSummary.module.css'

interface MarketBucketSummaryProps {
  bucketLabel: string
  displayedCount: number
  excludedCount: number
  reasonCounts?: Readonly<Partial<Record<CandidateQualityGateReason, number>>>
  language: Language
}

const copy = {
  en: {
    title: 'Market bucket summary', displayed: 'Displayed candidates', excluded: 'Excluded candidates', shortage: 'Candidate shortage', limited: 'Only candidates that pass the current review basis are shown.', zero: 'There are no displayable interest candidates for this market bucket today. The list is not filled with weak candidates.', reasons: { invalidPrice: 'Current price unavailable', insufficientBasis: 'Review basis insufficient', unavailableScore: 'Review score unavailable', belowThreshold: 'Review score too low', insufficientData: 'Data quality insufficient', basisUnavailable: 'Current basis unavailable' },
  },
  ko: {
    title: '시장군 요약', displayed: '표시 후보', excluded: '제외 후보', shortage: '후보 부족', limited: '현재 데이터 기준으로 검토 가능한 후보만 표시합니다.', zero: '오늘은 이 시장군에서 표시 가능한 관심 후보가 없습니다. 무리해서 후보를 채우지 않습니다.', reasons: { invalidPrice: '현재 가격 확인 불가', insufficientBasis: '판단 근거 부족', unavailableScore: '검토 점수 산정 불가', belowThreshold: '검토 점수 부족', insufficientData: '데이터 품질 부족', basisUnavailable: '현재 기준 비교 불가' },
  },
} as const

export function MarketBucketSummary({ bucketLabel, displayedCount, excludedCount, reasonCounts = {}, language }: MarketBucketSummaryProps) {
  const t = copy[language]
  const reasons = (Object.entries(reasonCounts) as [CandidateQualityGateReason, number][]).filter(([, count]) => count > 0)
  return <section className={styles.summary} aria-label={t.title}>
    <header><div><span>{t.title}</span><h2>{bucketLabel}</h2></div>{displayedCount < 5 && <b>{t.shortage}</b>}</header>
    <div className={styles.counts}><p><span>{t.displayed}</span><strong>{displayedCount}</strong></p><p><span>{t.excluded}</span><strong>{excludedCount}</strong></p></div>
    <p className={styles.message} role="status">{displayedCount === 0 ? t.zero : t.limited}</p>
    {reasons.length > 0 && <ul aria-label={t.excluded}>{reasons.map(([reason, count]) => <li key={reason}>{t.reasons[reason]} <span>{count}</span></li>)}</ul>}
  </section>
}
