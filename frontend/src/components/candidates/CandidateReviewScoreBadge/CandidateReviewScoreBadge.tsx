import type { Language } from '@/i18n/translations'
import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import styles from './CandidateReviewScoreBadge.module.css'

interface CandidateReviewScoreBadgeProps {
  result: CandidateReviewScore
  language: Language
}

const copy = {
  en: { score: 'Review score', unavailable: 'Score unavailable', help: 'Evidence-based review score.' },
  ko: { score: '검토 점수', unavailable: '점수 산정 불가', help: '현재 근거 기준 점수입니다.' },
} as const

export function CandidateReviewScoreBadge({ result, language }: CandidateReviewScoreBadgeProps) {
  const t = copy[language]
  const value = result.score === null ? t.unavailable : `${t.score} ${result.score}/100`
  return <div className={styles.badge} data-level={result.level} aria-label={`${value}. ${t.help}`}>
    <strong>{value}</strong>
    <span>{t.help}</span>
  </div>
}
