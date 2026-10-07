import { useMemo } from 'react'

import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Icon } from '@/components/Icon/Icon'
import { AiCopilotFinalReadCard } from '@/components/ai-copilot/AiCopilotFinalReadCard/AiCopilotFinalReadCard'
import { AiAnalysisFoundation } from '@/components/ai/AiAnalysisFoundation/AiAnalysisFoundation'
import { AiForecastPanel } from '@/components/ai/AiForecastPanel/AiForecastPanel'
import { InstrumentRelatedNews } from '@/components/news/InstrumentRelatedNews/InstrumentRelatedNews'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useUiStore } from '@/hooks/useUiStore'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { buildAiAnalysisContext } from '@/services/ai/aiAnalysisContextBuilder'
import { createMockAiAnalysis } from '@/services/ai/mockAiAnalysisEngine'
import { safelyCreateMockScenarioAnalysis } from '@/services/ai/mockScenarioService'
import { buildAiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import { buildCandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import type { AiScenarioTimeframe } from '@/types/aiScenario'
import styles from './AiCopilot.module.css'

export function AiCopilot() {
  const { toggleAiCopilot } = useUiStore()
  const { selectedInstrument, selectedTimeframe, activeMarketState, marketDataMode } = useMarketWorkspace()
  const { mode: newsProviderMode, result: newsResult } = useNewsProviderMode()
  const { language } = useLanguage()
  const text = uiText[language].copilot
  const liveInstrument = activeMarketState?.snapshot?.instrument
  const displayedInstrument = selectedInstrument && liveInstrument?.id === selectedInstrument.id
    ? liveInstrument : selectedInstrument
  const isStock = displayedInstrument?.marketId === 'korea-stock' || displayedInstrument?.marketId === 'us-stock'
  const scenarioTimeframe: AiScenarioTimeframe = selectedTimeframe === '1D' ? 'long'
    : selectedTimeframe === '4H' ? 'medium' : 'short'
  const scenarioAnalysis = useMemo(() => displayedInstrument ? safelyCreateMockScenarioAnalysis(displayedInstrument, language, scenarioTimeframe) : null, [displayedInstrument, language, scenarioTimeframe])
  const analysisContext = useMemo(() => buildAiAnalysisContext({
    instrument: displayedInstrument ?? null,
    scenario: scenarioAnalysis,
    newsProviderMode,
    newsResult,
    marketDataMode,
    connectionStatus: activeMarketState?.connection.status,
    language,
  }), [activeMarketState?.connection.status, displayedInstrument, language, marketDataMode, newsProviderMode, newsResult, scenarioAnalysis])
  const foundationResult = useMemo(() => analysisContext.status === 'ready' ? createMockAiAnalysis(analysisContext.input, language) : null, [analysisContext, language])
  const finalRead = useMemo(() => {
    if (!displayedInstrument) return null
    const matchingSnapshot = activeMarketState?.snapshot?.instrument.id === displayedInstrument.id ? activeMarketState.snapshot : null
    const catalogSource = activeMarketState?.connection.effectiveMode ?? marketDataMode
    const analysis = buildMyInstrumentAnalysis({
      instrument: displayedInstrument,
      intent: 'watching',
      userNote: '',
      averagePrice: null,
      catalogSource,
      newsResult,
      language,
    })
    const horizon = scenarioTimeframe === 'long' ? 'long' : scenarioTimeframe === 'medium' ? 'swing' : 'short'
    const practicalDecision = buildPracticalDecision({
      language,
      horizon,
      dataQuality: analysis.dataQuality,
      actionStatus: analysis.actionReadiness.status,
      source: 'analysis',
      reason: analysis.actionReadiness.whyThisStatus,
      nextCheck: analysis.reviewChecklist[0] ?? analysis.actionReadiness.nextChecks[0],
    })
    const reviewRanges = buildReviewRanges({ language, horizon, dataQuality: analysis.dataQuality, anchorPrice: displayedInstrument.lastPrice, source: 'current' })
    const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument: displayedInstrument, candles: matchingSnapshot?.candles ?? [], language, dataQuality: analysis.dataQuality })
    const reviewScore = buildCandidateReviewScore({
      language,
      dataQuality: analysis.dataQuality,
      practicalDecisionState: practicalDecision.state,
      clarity: analysis.actionReadiness.strength,
      hasReviewRanges: reviewRanges.length > 0,
      freshness: null,
      evidenceCount: analysis.evidence.length,
      missingEvidenceCount: analysis.missingEvidence.length,
      hasNewsEvidence: analysis.evidence.some((entry) => entry.type === 'news' || entry.type === 'market'),
      hasDisclosureEvidence: false,
    })
    return buildAiCopilotFinalRead({
      language,
      instrumentLabel: displayedInstrument.displaySymbol ?? displayedInstrument.symbol,
      practicalDecision,
      reviewScore,
      hasReviewRanges: reviewRanges.length > 0,
      hasTechnicalLevels: technicalAnalysis.levelSet.status === 'ready',
      isCrypto: displayedInstrument.marketId === 'upbit' || displayedInstrument.marketId.startsWith('binance'),
      dataAvailable: analysis.dataQuality !== 'unavailable',
    })
  }, [activeMarketState, displayedInstrument, language, marketDataMode, newsResult, scenarioTimeframe])

  return (
    <aside className={`${styles.copilot} ${isStock ? styles.stockContext : ''}`} aria-label="AI Copilot">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.aiIcon}><Icon name="sparkles" size={15} /></span>
          <div><strong>{text.title}</strong><span>{isStock ? text.company : text.scenario}</span></div>
        </div>
        <button type="button" onClick={toggleAiCopilot} aria-label="Close AI Copilot">×</button>
      </div>

      <div className={styles.contextBar}>
        <span>{text.context}</span>
        <strong>{displayedInstrument ? `${displayedInstrument.symbol} · ${displayedInstrument.marketId}` : text.none}</strong>
      </div>

      <div className={styles.content}>
        {selectedInstrument ? (
          <div className={styles.analysis}>
            <dl className={styles.marketFacts}>
              <div><dt>{text.price}</dt><dd>{formatMarketPrice(displayedInstrument!)}</dd></div>
              <div>
                <dt>{text.change}</dt>
                <dd className={displayedInstrument!.change24hPercent >= 0 ? styles.positive : styles.negative}>
                  {formatMarketChange(displayedInstrument!.change24hPercent)}
                </dd>
              </div>
            </dl>

            {finalRead && <AiCopilotFinalReadCard result={finalRead} language={language} />}

            <AiForecastPanel instrument={displayedInstrument!} timeframe={scenarioTimeframe} displayTimeframe={selectedTimeframe} analysis={scenarioAnalysis} />

            {analysisContext.status === 'ready' && foundationResult && <AiAnalysisFoundation input={analysisContext.input} result={foundationResult} language={language} />}

            <InstrumentRelatedNews instrument={displayedInstrument!} />

            <div className={styles.boundaryNote}>
              <Icon name="sparkles" size={13} />
              <p>{text.boundary}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            title={text.ready}
            description={text.selectScenario}
          />
        )}
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInput}>
          <span>{text.noModels}</span>
          <button type="button" disabled aria-label="Send message"><Icon name="arrowUpRight" size={15} /></button>
        </div>
        <p>{text.judgment}</p>
      </div>
    </aside>
  )
}
