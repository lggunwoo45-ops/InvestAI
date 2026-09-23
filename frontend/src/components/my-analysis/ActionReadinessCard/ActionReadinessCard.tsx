import type { Language } from '@/i18n/translations'
import type { ActionReadinessPlan } from '@/types/myAnalysis'
import styles from './ActionReadinessCard.module.css'

interface ActionReadinessCardProps {
  plan: ActionReadinessPlan
  language: Language
  mode: 'simple' | 'expert'
}

const copy = {
  en: {
    current: 'Current action status', readiness: 'Action readiness', clarity: 'Signal clarity', clarityHelp: 'Signal clarity describes how clear the current rule-based status is, not confidence or expected return.', why: 'Why this status', check: 'Conditions to check', avoid: 'Conditions to avoid', next: 'Next checks', strengths: { low: 'Low clarity', medium: 'Medium clarity', high: 'High clarity' },
  },
  ko: {
    current: '현재 액션 상태', readiness: '액션 준비도', clarity: '판단 명확도', clarityHelp: '판단 명확도는 현재 규칙 기반 상태의 명확도를 뜻하며, 확신도나 기대수익이 아닙니다.', why: '왜 이 상태인가요?', check: '확인할 조건', avoid: '피해야 할 조건', next: '다음 확인 항목', strengths: { low: '낮음', medium: '보통', high: '높음' },
  },
} as const

export function ActionReadinessCard({ plan, language, mode }: ActionReadinessCardProps) {
  const t = copy[language]
  const title = mode === 'simple' ? t.current : t.readiness

  return <section className={styles.card} data-mode={mode} aria-label={title}>
    <header>
      <div><span>{title}</span><h2>{plan.title}</h2></div>
      <div className={styles.statusMeta}><b data-strength={plan.strength}>{plan.title}</b><small>{t.clarity}: {t.strengths[plan.strength]}</small><p>{t.clarityHelp}</p></div>
    </header>
    <p className={styles.summary}>{plan.summary}</p>
    <div className={styles.reason}><strong>{t.why}</strong><p>{plan.whyThisStatus}</p></div>
    <div className={styles.conditionGrid}>
      <article><h3>{t.check}</h3><ul>{plan.approachConditions.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h3>{t.avoid}</h3><ul>{plan.avoidConditions.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h3>{t.next}</h3><ul>{plan.nextChecks.map((item) => <li key={item}>{item}</li>)}</ul></article>
    </div>
    <footer>{plan.disclaimer}</footer>
  </section>
}
