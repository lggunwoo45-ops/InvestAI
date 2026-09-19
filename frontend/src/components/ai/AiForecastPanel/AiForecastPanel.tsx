import { ScenarioCard } from '@/components/ai/ScenarioCard/ScenarioCard'
import { TradePlanningReference } from '@/components/ai/TradePlanningReference/TradePlanningReference'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { createMockScenarioAnalysis } from '@/services/ai/mockScenarioService'
import type { AiScenarioTimeframe } from '@/types/aiScenario'
import type { MarketInstrument } from '@/types/market'
import styles from './AiForecastPanel.module.css'

interface AiForecastPanelProps { instrument: MarketInstrument; timeframe: AiScenarioTimeframe }

export function AiForecastPanel({ instrument, timeframe }: AiForecastPanelProps) {
  const { language } = useLanguage()
  const text = uiText[language].copilot
  const analysis = createMockScenarioAnalysis(instrument, language, timeframe)
  return <section className={styles.forecast} aria-label={text.scenarioAnalysis}>
    <header className={styles.heading}>
      <div><span>{text.forecast}</span><strong>{text.scenarioAnalysis}</strong></div>
      <span>{text.mockScenario}</span>
    </header>
    <div className={styles.summary}>
      <div><span>{text.confidence}</span><strong>—</strong><small>{text.confidencePending}</small></div>
      <div><span>{text.marketBias} · {text.timeframe}</span><strong>{text.bias[analysis.marketBias]} · {text.analysisTimeframes[analysis.timeframe]}</strong><small>{text.possiblePaths}</small></div>
    </div>
    <section className={styles.rationale}><h3>{text.rationale}</h3><ul>{analysis.rationale.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <div className={styles.scenarios}>{Object.values(analysis.scenarios).map((scenario) => <ScenarioCard key={scenario.kind} scenario={scenario} language={language} />)}</div>
    <div className={styles.conditions}>
      <section><h3>{text.watchConditions}</h3><ul>{analysis.watchConditions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3>{text.riskFactors}</h3><ul>{analysis.riskFactors.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <TradePlanningReference plan={analysis.tradePlan} language={language} />
    <p className={styles.disclaimer}>{analysis.disclaimer} {text.analysisInactive}</p>
  </section>
}
