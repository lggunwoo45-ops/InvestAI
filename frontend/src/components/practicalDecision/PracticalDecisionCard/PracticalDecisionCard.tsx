import type { Language } from '@/i18n/translations'
import type { PracticalDecisionResult } from '@/types/practicalDecision'
import styles from './PracticalDecisionCard.module.css'

interface PracticalDecisionCardProps { result: PracticalDecisionResult; language: Language; compact?: boolean; showSafety?: boolean }
const copy = { en: { title: 'Current read', reason: 'Reason', next: 'Next check', caution: 'Caution', support: 'Decision-support information' }, ko: { title: '지금 판단', reason: '이유', next: '다음 확인', caution: '주의', support: '판단 보조 정보' } } as const

export function PracticalDecisionCard({ result, language, compact = false, showSafety = true }: PracticalDecisionCardProps) {
  const t = copy[language]
  return <section className={styles.card} data-state={result.state} data-compact={compact || undefined} aria-label={t.support}>
    <header><span>{t.support}</span><h3>{t.title}: {result.title}</h3><p>{result.summary}</p></header>
    <dl><div><dt>{t.reason}</dt><dd>{result.reason}</dd></div><div><dt>{t.next}</dt><dd>{result.nextCheck}</dd></div></dl>
    {showSafety && <p className={styles.caution}><strong>{t.caution}</strong>{result.caution}</p>}
  </section>
}
