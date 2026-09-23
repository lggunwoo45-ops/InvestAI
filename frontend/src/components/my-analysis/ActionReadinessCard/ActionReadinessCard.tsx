import type { Language } from '@/i18n/translations'
import type { ActionReadinessPlan, AnalysisAssetType } from '@/types/myAnalysis'
import styles from './ActionReadinessCard.module.css'

interface ActionReadinessCardProps {
  plan: ActionReadinessPlan
  assetType: AnalysisAssetType
  language: Language
  mode: 'simple' | 'expert'
}

const copy = {
  en: {
    current: 'Current action status', readiness: 'Action readiness', strength: 'Strength', why: 'Why this status', check: 'Conditions to check', avoid: 'Conditions to avoid', next: 'Next checks', zones: 'Review zones', stockZones: 'Stock price zones will be available after reliable stock data is connected.', cryptoZones: 'Review zones require available core market data.', strengths: { low: 'Low', medium: 'Medium', high: 'High' },
  },
  ko: {
    current: '현재 액션 상태', readiness: '액션 준비도', strength: '강도', why: '왜 이 상태인가요?', check: '확인할 조건', avoid: '피해야 할 조건', next: '다음 확인 항목', zones: '검토 구간', stockZones: '주식 가격 구간은 실제 데이터 연결 후 제공됩니다.', cryptoZones: '핵심 시장 데이터를 확인할 수 있어야 검토 구간이 제공됩니다.', strengths: { low: '낮음', medium: '보통', high: '높음' },
  },
} as const

export function ActionReadinessCard({ plan, assetType, language, mode }: ActionReadinessCardProps) {
  const t = copy[language]
  const title = mode === 'simple' ? t.current : t.readiness

  return <section className={styles.card} data-mode={mode} aria-label={title}>
    <header>
      <div><span>{title}</span><h2>{plan.title}</h2></div>
      <div className={styles.statusMeta}><b data-strength={plan.strength}>{plan.title}</b><small>{t.strength}: {t.strengths[plan.strength]}</small></div>
    </header>
    <p className={styles.summary}>{plan.summary}</p>
    <div className={styles.reason}><strong>{t.why}</strong><p>{plan.whyThisStatus}</p></div>
    <div className={styles.conditionGrid}>
      <article><h3>{t.check}</h3><ul>{plan.approachConditions.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h3>{t.avoid}</h3><ul>{plan.avoidConditions.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h3>{t.next}</h3><ul>{plan.nextChecks.map((item) => <li key={item}>{item}</li>)}</ul></article>
    </div>
    <div className={styles.zones}>
      <h3>{t.zones}</h3>
      {assetType === 'stock' ? <p className={styles.stockUnavailable}>{t.stockZones}</p> : plan.zones.length === 0 ? <p className={styles.stockUnavailable}>{t.cryptoZones}</p> : <div className={styles.zoneGrid}>{plan.zones.map((zone) => <article key={zone.id}><strong>{zone.label}</strong><b>{zone.distanceLabel}</b><p>{zone.description}</p><small>{zone.note}</small></article>)}</div>}
    </div>
    <footer>{plan.disclaimer}</footer>
  </section>
}
