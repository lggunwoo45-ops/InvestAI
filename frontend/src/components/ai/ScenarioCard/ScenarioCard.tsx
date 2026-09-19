import type { AiScenarioItem } from '@/types/aiScenario'
import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import styles from './ScenarioCard.module.css'

interface ScenarioCardProps { scenario: AiScenarioItem; language: Language }

export function ScenarioCard({ scenario, language }: ScenarioCardProps) {
  const text = uiText[language].copilot
  return <article className={styles.card} data-scenario={scenario.kind}>
    <header><strong>{scenario.label}</strong><div><span className={styles.status}>{text.statusLabels[scenario.status]}</span><span>{scenario.probability === null ? text.probabilityPending : `${scenario.probability}%`}</span></div></header>
    <p>{scenario.summary}</p>
    <dl>
      <div><dt>{text.supportingConditions}</dt><dd><ul>{scenario.conditions.map((item) => <li key={item}>{item}</li>)}</ul></dd></div>
      <div><dt>{text.invalidation}</dt><dd>{scenario.invalidation}</dd></div>
      <div><dt>{text.riskNote}</dt><dd>{scenario.risks.join(' · ')}</dd></div>
    </dl>
  </article>
}
