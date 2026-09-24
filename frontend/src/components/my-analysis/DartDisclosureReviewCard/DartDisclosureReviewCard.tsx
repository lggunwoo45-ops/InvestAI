import type { Language } from '@/i18n/translations'
import type { DartDisclosureReview } from '@/types/dart'
import styles from './DartDisclosureReviewCard.module.css'

interface DartDisclosureReviewCardProps {
  language: Language
  review: DartDisclosureReview
  disclosurePanelId?: string
}

const copy = {
  en: { eyebrow: 'Disclosure review', types: 'Disclosure type', periodic: 'Periodic report', material: 'Material disclosure', correction: 'Correction disclosure', other: 'Other', points: 'Review points', original: 'Check original disclosure', evidence: 'Disclosure titles are shown as source evidence only.', safety: 'This is not investment advice or a trade instruction.' },
  ko: { eyebrow: '공시 점검', types: '공시 유형', periodic: '정기보고서', material: '주요사항', correction: '정정공시', other: '기타', points: '확인 포인트', original: '원문 확인', evidence: '공시 제목은 근거 자료로만 표시됩니다.', safety: '투자 조언이나 거래 지시가 아닙니다.' },
} as const

export function DartDisclosureReviewCard({ language, review, disclosurePanelId }: DartDisclosureReviewCardProps) {
  const t = copy[language]
  const available = review.status === 'review_available' || review.status === 'review_needed'
  const counts = [[t.periodic, review.counts.periodic], [t.material, review.counts.material], [t.correction, review.counts.correction], [t.other, review.counts.other]] as const

  return <section className={styles.card} data-status={review.status} aria-label={t.eyebrow}>
    <header><div><span>{t.eyebrow}</span><h2>{review.headline}</h2></div><b>{review.sourceMode}</b></header>
    <p className={styles.summary} role="status">{review.summary}</p>
    {available && <>
      <div className={styles.counts} aria-label={t.types}>{counts.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
      <div className={styles.points}><h3>{t.points}</h3><ul>{review.reviewPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul></div>
      {disclosurePanelId && <a href={`#${disclosurePanelId}`}>{t.original} ↓</a>}
    </>}
    <footer><span>{t.evidence}</span><small>{review.caution} {t.safety}</small></footer>
  </section>
}
