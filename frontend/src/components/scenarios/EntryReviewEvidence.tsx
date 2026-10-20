import type { Language } from '@/i18n/translations'
import type { AnalysisFrame } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { entryCheckKeys, type ScenarioEntryReview } from '@/services/scenarios/scenarioEntryReview'
import { scenarioCopy } from './scenarioCopy'
import styles from './Scenarios.module.css'

export function EntryReviewEvidence({ review, frame, language }: { review: ScenarioEntryReview; frame: AnalysisFrame; language: Language }) {
  const t = scenarioCopy[language]
  const remaining = entryCheckKeys.filter(key => review.checks[key] !== true)
  const passed = entryCheckKeys.length - remaining.length
  return <div className={styles.entryReview}>
    <p>{t.entryExplanation[review.status]}</p>
    {review.status === 'waiting' && <p className={styles.caption}>{t.next}: {remaining.slice(0, 2).map(key => t.entryChecks[key]).join(' · ')}</p>}
    <details><summary>{t.evidence} · {t.frame[frame]} · {passed}/5</summary>
      <ul className={styles.checklist}>{entryCheckKeys.map(key => <li key={key} data-passed={review.checks[key] === true}>
        <span>{t.entryChecks[key]}</span><strong>{review.checks[key] === true ? t.passed : review.checks[key] === null ? t.missing : t.pending}</strong>
        {key === 'volume' && review.volumeRatio !== null && <small>≈ {review.volumeRatio.toFixed(2)}×</small>}
        {key === 'rewardRisk' && review.rewardRisk !== null && <small>≈ {review.rewardRisk.toFixed(2)} : 1</small>}
        {key === 'heat' && review.rsi !== null && <small>RSI {review.rsi.toFixed(1)}</small>}
      </li>)}</ul>
      {review.asOf !== null && <small>{t.closedAt}: {new Date(review.asOf).toLocaleString(language)}</small>}
      <p className={styles.caption}>{t.entryRules}</p><p className={styles.caption}>{t.entryLimit}</p>
    </details>
  </div>
}
