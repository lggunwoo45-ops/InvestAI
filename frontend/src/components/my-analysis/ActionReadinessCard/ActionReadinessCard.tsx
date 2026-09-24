import type { Language } from '@/i18n/translations'
import type { ActionReadinessPlan } from '@/types/myAnalysis'
import styles from './ActionReadinessCard.module.css'

interface ActionReadinessCardProps {
  plan: ActionReadinessPlan
  language: Language
  mode: 'simple' | 'expert'
  showRuleBasis?: boolean
}

const copy = {
  en: {
    current: 'Current action status', readiness: 'Action readiness', ruleBased: 'Rule-based status', ruleBasis: 'Rule basis', clarity: 'Signal clarity', clarityHelp: 'This describes how clearly the rule-based status is classified, not expected return.', why: 'Why this status', check: 'Conditions to check', avoid: 'Conditions to avoid', next: 'Next checks', safety: 'Safety note', strengths: { low: 'Low clarity', medium: 'Medium clarity', high: 'High clarity' },
  },
  ko: {
    current: '현재 액션 상태', readiness: '액션 준비도', ruleBased: '규칙 기반 상태', ruleBasis: '규칙 근거', clarity: '판단 명확도', clarityHelp: '현재 규칙 기반 상태가 얼마나 명확한지를 뜻하며, 기대수익이나 확신도가 아닙니다.', why: '왜 이 상태인가요?', check: '확인할 조건', avoid: '피해야 할 조건', next: '다음 확인 항목', safety: '안전 안내', strengths: { low: '낮음', medium: '보통', high: '높음' },
  },
} as const

export function ActionReadinessCard({ plan, language, mode, showRuleBasis = true }: ActionReadinessCardProps) {
  const t = copy[language]
  const title = mode === 'simple' ? t.current : t.readiness
  const limit = (items: readonly string[]) => mode === 'simple' ? items.slice(0, 3) : items

  return <section className={styles.card} data-mode={mode} data-status={plan.status} aria-label={title}>
    <header className={styles.header}>
      <div className={styles.badges}>
        <b className={styles.statusBadge} data-status={plan.status}>{plan.title}</b>
        <b className={styles.clarityBadge} data-strength={plan.strength}>{t.clarity}: {t.strengths[plan.strength]}</b>
        <b className={styles.dataBadge} data-quality={plan.dataQuality}>{plan.dataQualityLabel}</b>
      </div>
      <div className={styles.heading}><span>{t.ruleBased}</span><h2>{title}</h2><p>{t.clarityHelp}</p></div>
    </header>
    <p className={styles.summary}>{plan.summary}</p>
    {mode === 'expert' && <div className={styles.detailGrid}>
      <article className={styles.reason}><h3>{t.why}</h3><p>{plan.whyThisStatus}</p></article>
      <article><h3>{t.check}</h3><ul>{limit(plan.approachConditions).map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h3>{t.avoid}</h3><ul>{limit(plan.avoidConditions).map((item) => <li key={item}>{item}</li>)}</ul></article>
    </div>}
    {mode === 'expert' && showRuleBasis && <section className={styles.ruleBasis} aria-label={t.ruleBasis}><h3>{t.ruleBasis}</h3><dl>{plan.ruleBasis.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>}
    {mode === 'expert' && <section className={styles.nextChecks}><h3>{t.next}</h3><ul>{limit(plan.nextChecks).map((item) => <li key={item}>{item}</li>)}</ul></section>}
    <footer><strong>{t.safety}</strong><span>{plan.disclaimer}</span></footer>
  </section>
}
