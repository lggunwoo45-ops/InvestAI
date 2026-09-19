import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import type { AiScenarioAnalysis, AiScenarioKind } from '@/types/aiScenario'
import styles from './ScenarioMap.module.css'

interface ScenarioMapProps { analysis: AiScenarioAnalysis; language: Language }

const kinds: readonly AiScenarioKind[] = ['bullish', 'neutral', 'bearish']

export function ScenarioMap({ analysis, language }: ScenarioMapProps) {
  const text = uiText[language].copilot
  return <section className={styles.map} aria-label={text.scenarioMap}>
    <h3>{text.scenarioMap}</h3>
    <ul>{kinds.map((kind) => <li key={kind}><strong>{analysis.scenarios[kind].label}</strong><span>{analysis.scenarioMap[kind]}</span></li>)}</ul>
    <p>{text.possiblePaths}</p>
  </section>
}
