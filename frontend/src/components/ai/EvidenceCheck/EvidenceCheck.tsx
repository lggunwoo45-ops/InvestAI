import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import type { AiScenarioEvidence } from '@/types/aiScenario'
import styles from './EvidenceCheck.module.css'

interface EvidenceCheckProps { evidence: AiScenarioEvidence; language: Language }

export function EvidenceCheck({ evidence, language }: EvidenceCheckProps) {
  const text = uiText[language].copilot
  const rows = [
    [text.priceAction, text.mockPlaceholder],
    [text.volumeEvidence, text.mockPlaceholder],
    [text.newsContext, evidence.newsContext === 'demo-only' ? text.demoOnly : text.mockPlaceholder],
    [text.marketRegime, text.mockPlaceholder],
    [text.missingEvidence, evidence.missingEvidence.includes('real-ai') ? text.missingConnections : text.mockPlaceholder],
  ] as const
  return <section className={styles.panel} aria-label={text.evidenceCheck}>
    <header><strong>{text.evidenceCheck}</strong><span>{text.incompleteEvidence}</span></header>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>
}
