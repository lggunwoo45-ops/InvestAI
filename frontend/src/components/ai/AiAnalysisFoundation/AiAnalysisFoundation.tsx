import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import type { AiAnalysisInput, AiAnalysisResult, AiEvidenceStatus } from '@/types/aiAnalysis'
import styles from './AiAnalysisFoundation.module.css'

interface AiAnalysisFoundationProps {
  input: AiAnalysisInput
  result: AiAnalysisResult
  language: Language
}

function statusLabel(status: AiEvidenceStatus, language: Language) {
  const text = uiText[language].copilot.analysisFoundation
  if (status === 'available') return text.available
  if (status === 'demo' || status === 'placeholder') return text.demoOnly
  return text.missing
}

/** Transparent display of the evidence package; this component never invokes AI. */
export function AiAnalysisFoundation({ input, result, language }: AiAnalysisFoundationProps) {
  const text = uiText[language].copilot.analysisFoundation
  const packageRows = [
    [text.priceData, input.quote.quoteStatus === 'available' ? text.available : text.missing, input.quote.quoteStatus === 'available' ? 'available' : 'missing'],
    [text.newsData, input.newsContext.isDemoOnly ? text.demoOnly : text.available, input.newsContext.isDemoOnly ? 'demo' : 'available'],
    [text.scenarioData, input.scenarioContext.evidenceState === 'demo' ? text.demoOnly : text.missing, input.scenarioContext.evidenceState],
    [text.aiModel, text.notConnected, 'missing'],
    [text.newsBackend, text.notConnected, 'missing'],
    [text.portfolioContext, text.notConnected, 'missing'],
  ] as const

  return <section className={styles.panel} aria-label={text.title}>
    <header>
      <div><strong>{text.title}</strong><span>{text.futurePackage}</span></div>
      <div className={styles.badges}><span>{text.mockAnalysis}</span><span>{text.realAiInactive}</span></div>
    </header>
    <p className={styles.inactive}>{text.inactiveMessage}</p>
    <div className={styles.summary}><span>{text.status}</span><strong>{text.mockAnalysis} · {result.status === 'incomplete-evidence' ? text.missingEvidence : text.available}</strong></div>
    <p className={styles.resultSummary}>{result.summary}</p>
    <section className={styles.reason}><h3>{text.watchReason}</h3><p>{result.watchReason}</p></section>
    <section><h3>{text.evidenceUsed}</h3><dl className={styles.evidence}>{result.evidenceUsed.map((item) => <div key={item.type} data-status={item.status}><dt>{item.label}</dt><dd>{statusLabel(item.status, language)}</dd></div>)}</dl></section>
    <section><h3>{text.missingEvidence}</h3><ul>{result.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section><h3>{text.riskSummary}</h3><p>{result.riskSummary}</p></section>
    <section><h3>{text.nextWatchPoints}</h3><ul>{result.nextWatchPoints.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <details className={styles.package}>
      <summary>{text.inputPackage}</summary>
      <dl>{packageRows.map(([label, value, status]) => <div key={label} data-status={status}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </details>
    <p className={styles.disclaimer}>{text.disclaimer} · {text.finalDecision}</p>
  </section>
}
