import { useMemo } from 'react'

import { EvidenceCheck } from '@/components/ai/EvidenceCheck/EvidenceCheck'
import { ScenarioCard } from '@/components/ai/ScenarioCard/ScenarioCard'
import { ScenarioMap } from '@/components/ai/ScenarioMap/ScenarioMap'
import { TradePlanningReference } from '@/components/ai/TradePlanningReference/TradePlanningReference'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { safelyCreateMockScenarioAnalysis } from '@/services/ai/mockScenarioService'
import type { AiScenarioTimeframe } from '@/types/aiScenario'
import type { MarketInstrument } from '@/types/market'
import styles from './AiForecastPanel.module.css'

interface AiForecastPanelProps { instrument: MarketInstrument; timeframe: AiScenarioTimeframe; displayTimeframe: string }

export function AiForecastPanel({ instrument, timeframe, displayTimeframe }: AiForecastPanelProps) {
  const { language } = useLanguage()
  const text = uiText[language].copilot
  const analysis = useMemo(() => safelyCreateMockScenarioAnalysis(instrument, language, timeframe), [instrument, language, timeframe])
  if (!analysis) return <section className={styles.unavailable} aria-label={text.scenarioAnalysis}><strong>{text.scenarioAnalysis}</strong><p>{text.analysisUnavailable}</p><small>{text.analysisInactive}</small></section>
  const generatedAt = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(analysis.generatedAt))
  return <section className={styles.forecast} aria-label={text.scenarioAnalysis}>
    <header className={styles.heading}>
      <div className={styles.identity}><span>{text.forecast} · {text.scenarioAnalysis} / {instrument.marketId}</span><strong>{instrument.symbol}</strong><small>{instrument.name}</small></div>
      <div className={styles.badges}><span>{text.mockScenario}</span><span>{text.aiInactive}</span><span>{displayTimeframe} · {text.analysisTimeframes[analysis.timeframe]}</span></div>
    </header>
    <div className={styles.summary}>
      <div><span>{text.marketBias}</span><strong>{text.bias[analysis.marketBias]}</strong></div>
      <div><span>{text.confidence}</span><strong>—</strong><small>{text.confidencePending}</small></div>
      <div><span>{text.scenarioStatus}</span><strong>{text.mockScenario}</strong><small>{text.possiblePaths}</small></div>
      <div><span>{text.lastGenerated}</span><strong>{generatedAt}</strong><small>{text.mockScenario}</small></div>
    </div>
    <ScenarioMap analysis={analysis} language={language} />
    <section className={styles.rationale}><h3>{text.rationale}</h3><ul>{analysis.rationale.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <div className={styles.scenarios}>{Object.values(analysis.scenarios).map((scenario) => <ScenarioCard key={scenario.kind} scenario={scenario} language={language} />)}</div>
    <div className={styles.conditions}>
      <section><h3>{text.watchConditions}</h3><ul>{analysis.watchConditions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3>{text.riskFactors}</h3><ul>{analysis.riskFactors.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <EvidenceCheck evidence={analysis.evidence} language={language} />
    <TradePlanningReference plan={analysis.tradePlan} language={language} />
    <p className={styles.disclaimer}>{analysis.disclaimer} {text.analysisInactive}</p>
  </section>
}
