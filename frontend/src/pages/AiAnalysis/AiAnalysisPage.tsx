import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { AiUsagePlans } from '@/components/ai/AiUsagePlans/AiUsagePlans'
import { AiAnalysisTerminalLayout } from '@/components/ai-analysis/AiAnalysisTerminalLayout'
import { CandidateInspectorPanel } from '@/components/ai-analysis/CandidateInspectorPanel'
import { CandidateTerminalList } from '@/components/ai-analysis/CandidateTerminalList'
import { buildCandidateTerminalItems } from '@/components/ai-analysis/candidateTerminalModel'
import { MarketContextStrip } from '@/components/ai-analysis/MarketContextStrip'
import { MarketTerminalHeader } from '@/components/ai-analysis/MarketTerminalHeader'
import { CandidateHorizonSelector } from '@/components/candidates/CandidateHorizonSelector/CandidateHorizonSelector'
import { MarketBucketSelector } from '@/components/candidates/MarketBucketSelector/MarketBucketSelector'
import { deriveBeginnerInterestStage } from '@/components/my-analysis/BeginnerInterestZone/beginnerInterestZoneModel'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildCandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import { buildCandidateCurrentState, buildCandidateSnapshot } from '@/services/candidateSnapshot/candidateSnapshotBuilder'
import { classifyCandidateQualityStatus, filterDisplayedCandidates, loadCandidateDisplayFilter, saveCandidateDisplayFilter, type CandidateDisplayFilter } from '@/services/candidateSnapshot/candidateDisplayClassification'
import type { CandidateQualityGateInput } from '@/services/candidateSnapshot/candidateQualityGate'
import { getDailyBasisTime } from '@/services/candidateSnapshot/dailyBasisTime'
import { selectDailyBucketCandidates } from '@/services/candidateSnapshot/dailyBucketCandidateSelector'
import { buildDailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import { loadDailyBucketSnapshots, saveDailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshotStorage'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import { buildBitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { CandidateSnapshotBuildSource, CandidateSnapshotItem } from '@/types/candidateSnapshot'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import { getMarketBuckets, type MarketBucketId } from '@/types/marketBucket'
import type { WatchCandidate, WatchCandidateHorizon } from '@/types/watchCandidate'
import { loadCandidateSnapshots } from '@/utils/candidateSnapshotStorage'
import styles from './AiAnalysisPage.module.css'

const DAILY_DEFAULT_HORIZON: WatchCandidateHorizon = 'swing'

function qualityGateInput(source: CandidateSnapshotBuildSource, horizon: WatchCandidateHorizon): CandidateQualityGateInput {
  const interestStage = deriveBeginnerInterestStage(source.analysis)
  const movementBand = source.analysis.actionReadiness.ruleBasis.find((item) => item.key === 'movementBand')?.value ?? null
  const practicalDecision = buildPracticalDecision({ language: 'en', horizon, dataQuality: source.analysis.dataQuality, actionStatus: source.analysis.actionReadiness.status, interestStage, movementBand, source: 'snapshot', reason: source.candidate.watchReason })
  const ranges = buildReviewRanges({ language: 'en', horizon, dataQuality: source.analysis.dataQuality, anchorPrice: source.instrument.lastPrice, source: 'snapshot' })
  const reviewScore = buildCandidateReviewScore({ language: 'en', dataQuality: source.analysis.dataQuality, practicalDecisionState: practicalDecision.state, clarity: source.analysis.actionReadiness.strength, hasReviewRanges: ranges.length > 0, freshness: 'basisHeld', evidenceCount: source.analysis.evidence.length, missingEvidenceCount: source.analysis.missingEvidence.length, hasNewsEvidence: source.analysis.evidence.some((entry) => entry.type === 'news' || entry.type === 'market'), hasDisclosureEvidence: false })
  return { currentPrice: source.instrument.lastPrice, practicalDecisionState: practicalDecision.state, reviewScore, dataQuality: source.analysis.dataQuality, freshness: 'basisHeld', missingEvidenceCount: source.analysis.missingEvidence.length, hasCautionState: practicalDecision.state === 'extendedCaution' || practicalDecision.state === 'postDropReview' }
}

function savedSnapshotFilterInput(item: CandidateSnapshotItem, horizon: WatchCandidateHorizon): CandidateQualityGateInput {
  const decision = buildPracticalDecision({ language: 'en', horizon, dataQuality: item.dataQuality, actionStatus: item.actionStatus, interestStage: item.interestStage, freshness: 'basisHeld', movementBand: item.basisMovementBand, source: 'snapshot', reason: item.reasonText })
  const ranges = buildReviewRanges({ language: 'en', horizon, dataQuality: item.dataQuality, anchorPrice: item.basisPrice, source: 'snapshot' })
  const newsState = item.newsState.toLocaleLowerCase()
  const missingEvidenceCount = newsState.includes('unavailable') || newsState.includes('not available') || newsState.includes('없음') ? 1 : 0
  const reviewScore = buildCandidateReviewScore({ language: 'en', dataQuality: item.dataQuality, practicalDecisionState: decision.state, clarity: item.clarity, hasReviewRanges: ranges.length > 0, freshness: 'basisHeld', evidenceCount: item.ruleBasis.length + (item.disclosureCount > 0 ? 1 : 0), missingEvidenceCount, hasNewsEvidence: missingEvidenceCount === 0, hasDisclosureEvidence: item.disclosureCount > 0 })
  return { currentPrice: item.basisPrice, practicalDecisionState: decision.state, reviewScore, dataQuality: item.dataQuality, freshness: 'basisHeld', missingEvidenceCount, hasCautionState: decision.state === 'extendedCaution' || decision.state === 'postDropReview' }
}

export function AiAnalysisPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const { marketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const [bucketId, setBucketId] = useState<MarketBucketId>('upbit')
  const [horizon, setHorizon] = useState<WatchCandidateHorizon>(DAILY_DEFAULT_HORIZON)
  const [previousSnapshots] = useState(loadCandidateSnapshots)
  const [snapshotRecords, setSnapshotRecords] = useState(loadDailyBucketSnapshots)
  const [clock, setClock] = useState(() => new Date().toISOString())
  const [selectedByBucket, setSelectedByBucket] = useState<Partial<Record<MarketBucketId, string>>>({})
  const [candidateDisplayFilter, setCandidateDisplayFilter] = useState(loadCandidateDisplayFilter)

  const upbitKrw = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const upbitBtc = useMarketCatalog('upbit-btc', marketDataMode, 0)
  const upbitUsdt = useMarketCatalog('upbit-usdt', marketDataMode, 0)
  const binanceSpot = useMarketCatalog('binance-spot', marketDataMode, 0)
  const binanceFutures = useMarketCatalog('binance-futures', marketDataMode, 0)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)

  const pageCopy = language === 'ko'
    ? { eyebrow: '일일 시장 검토', title: '오늘의 관심 후보', description: '매일 08:00 기준으로 확인하는 시장별 후보입니다.', advanced: '상세 기준 보기', advancedHelp: '기존 기간 기준은 전문가 검토용입니다. 저장된 일일 후보는 새로고침 전까지 바뀌지 않습니다.' }
    : { eyebrow: 'DAILY MARKET REVIEW', title: 'Today’s interest candidates', description: 'Daily market candidates reviewed around the 08:00 basis.', advanced: 'Advanced criteria', advancedHelp: 'The existing horizon criteria are for expert review. A saved daily list does not change until refreshed.' }
  useDocumentTitle(pageCopy.title)

  const catalogs = useMemo(() => ({
    upbit: [upbitKrw.catalog, upbitBtc.catalog, upbitUsdt.catalog],
    binance: [binanceSpot.catalog, binanceFutures.catalog],
    kospi: [kospi.catalog],
    kosdaq: [kosdaq.catalog],
    usStocks: [nasdaq.catalog, nyse.catalog],
  }) satisfies Record<MarketBucketId, readonly (MarketCatalog | null)[]>, [binanceFutures.catalog, binanceSpot.catalog, kosdaq.catalog, kospi.catalog, nasdaq.catalog, nyse.catalog, upbitBtc.catalog, upbitKrw.catalog, upbitUsdt.catalog])
  const activeCatalogs = catalogs[bucketId]
  const activeInstruments: readonly MarketInstrument[] = useMemo(() => activeCatalogs.flatMap((catalog) => catalog?.instruments ?? []), [activeCatalogs])
  const activeCatalogSource = activeCatalogs.some((catalog) => catalog?.source === 'live') ? 'live' : activeCatalogs.some((catalog) => catalog?.source === 'mock') ? 'mock' : 'unavailable'
  const activeCandidates: readonly WatchCandidate[] = useMemo(() => {
    if (bucketId === 'upbit' || bucketId === 'binance') return buildCryptoWatchCandidates({ instruments: activeInstruments, newsResult, language, horizon, previousSnapshots, limit: 10 })
    return buildStockWatchCandidates({ instruments: activeInstruments, region: bucketId === 'usStocks' ? 'us' : 'korea', newsResult, language, horizon, limit: 10 })
  }, [activeInstruments, bucketId, horizon, language, newsResult, previousSnapshots])
  const selectedCandidates = useMemo(() => selectDailyBucketCandidates(bucketId, activeCandidates, activeInstruments, 10), [activeCandidates, activeInstruments, bucketId])
  const candidateSources = useMemo(() => selectedCandidates.map(({ candidate, instrument }): CandidateSnapshotBuildSource => ({
    candidate,
    instrument,
    analysis: buildMyInstrumentAnalysis({ instrument, candidate, intent: 'watching', userNote: '', averagePrice: null, catalogSource: activeCatalogSource === 'live' ? 'live' : activeCatalogSource === 'mock' ? 'mock' : null, newsResult, language: 'en' }),
  })), [activeCatalogSource, newsResult, selectedCandidates])
  const candidateSourceQualityInputs = useMemo(() => new Map(candidateSources.map((source) => [source.instrument.id, qualityGateInput(source, horizon)])), [candidateSources, horizon])
  const allCandidateQualityStatus = useMemo(() => classifyCandidateQualityStatus(candidateSources, (source) => candidateSourceQualityInputs.get(source.instrument.id)!), [candidateSourceQualityInputs, candidateSources])
  const candidateQualityScan = useMemo(() => {
    const fifthDisplayed = allCandidateQualityStatus.displayed[4]
    if (!fifthDisplayed) return candidateSources
    return candidateSources.slice(0, candidateSources.indexOf(fifthDisplayed) + 1)
  }, [allCandidateQualityStatus.displayed, candidateSources])
  const candidateQualityStatus = useMemo(() => classifyCandidateQualityStatus(candidateQualityScan, (source) => candidateSourceQualityInputs.get(source.instrument.id)!), [candidateQualityScan, candidateSourceQualityInputs])
  const snapshotSources = useMemo(() => candidateQualityStatus.displayed.slice(0, 5), [candidateQualityStatus.displayed])
  const activeSnapshot = snapshotRecords.find((snapshot) => snapshot.bucketId === bucketId) ?? null
  const currentStates = useMemo(() => new Map(candidateSources.map((source) => [source.instrument.id, buildCandidateCurrentState(source)])), [candidateSources])
  const currentPrices = useMemo(() => new Map(activeInstruments.map((instrument) => [instrument.id, instrument.lastPrice])), [activeInstruments])
  const basis = useMemo(() => getDailyBasisTime(new Date(clock)), [clock])
  const savedSnapshotFilterInputs = useMemo(() => activeSnapshot ? new Map(activeSnapshot.items.map((item) => [item.instrumentId, savedSnapshotFilterInput(item, DAILY_DEFAULT_HORIZON)])) : null, [activeSnapshot])
  const displaySnapshot = useMemo(() => activeSnapshot && savedSnapshotFilterInputs ? {
    ...activeSnapshot,
    items: filterDisplayedCandidates(activeSnapshot.items, (item) => savedSnapshotFilterInputs.get(item.instrumentId)!, candidateDisplayFilter),
  } : activeSnapshot, [activeSnapshot, candidateDisplayFilter, savedSnapshotFilterInputs])
  const marketBuckets = useMemo(() => getMarketBuckets(language), [language])
  const bucketLabel = marketBuckets.find((bucket) => bucket.id === bucketId)?.label ?? bucketId
  const bitcoinAnchor = useMemo(() => bucketId === 'upbit' || bucketId === 'binance' ? buildBitcoinMarketAnchor({ marketBucket: bucketId, instruments: activeInstruments, catalogSource: activeCatalogSource === 'live' ? 'live' : activeCatalogSource === 'mock' ? 'mock' : null, newsResult, language }) : null, [activeCatalogSource, activeInstruments, bucketId, language, newsResult])
  const terminalItems = useMemo(() => displaySnapshot ? buildCandidateTerminalItems({ items: displaySnapshot.items, expiresAt: displaySnapshot.expiresAt, currentStates, currentPrices, horizon, language, now: clock }) : [], [clock, currentPrices, currentStates, displaySnapshot, horizon, language])
  const heldCandidateSnapshot = useMemo(() => {
    const heldSources = candidateQualityStatus.heldForReview.map(({ item }) => item)
    if (heldSources.length === 0) return null
    return buildCandidateSnapshot({ sources: heldSources, generatedAt: clock, expiresAt: basis.nextDailyBasisAt, snapshotId: `display-held-${bucketId}`, catalogSource: activeCatalogSource, providerLabel: `Held ${bucketId}` })
  }, [activeCatalogSource, basis.nextDailyBasisAt, bucketId, candidateQualityStatus.heldForReview, clock])
  const heldTerminalItems = useMemo(() => {
    if (!heldCandidateSnapshot) return []
    const reasons = new Map(candidateQualityStatus.heldForReview.map(({ item, reason }) => [item.instrument.id, reason]))
    return buildCandidateTerminalItems({ items: heldCandidateSnapshot.items, expiresAt: heldCandidateSnapshot.expiresAt, currentStates, currentPrices, horizon, language, now: clock }).map((candidate) => ({ candidate, reason: reasons.get(candidate.item.instrumentId)! }))
  }, [candidateQualityStatus.heldForReview, clock, currentPrices, currentStates, heldCandidateSnapshot, horizon, language])
  const selectedInstrumentId = terminalItems.some((entry) => entry.item.instrumentId === selectedByBucket[bucketId]) ? selectedByBucket[bucketId] ?? null : terminalItems[0]?.item.instrumentId ?? null
  const selectedTerminalItem = terminalItems.find((entry) => entry.item.instrumentId === selectedInstrumentId) ?? null
  const selectedInstrument = activeInstruments.find((instrument) => instrument.id === selectedInstrumentId) ?? null
  const technicalLevelData = useTechnicalLevelData(selectedInstrument)
  const technicalAnalysis = useMemo(() => {
    if (!selectedInstrument) return null
    const instrument = technicalLevelData.currentPrice === null
      ? selectedInstrument
      : { ...selectedInstrument, lastPrice: technicalLevelData.currentPrice }
    return buildTechnicalLevelAnalysis({
      instrument,
      candles: technicalLevelData.candles,
      language,
      dataQuality: technicalLevelData.dataQuality,
    })
  }, [language, selectedInstrument, technicalLevelData.candles, technicalLevelData.currentPrice, technicalLevelData.dataQuality])
  const qualityDisplayedCount = candidateQualityStatus.displayed.length
  const heldCount = candidateQualityStatus.heldForReview.length
  const excludedCount = candidateQualityStatus.excluded.length
  const snapshotStatus = !displaySnapshot ? 'pending' : displaySnapshot.tradingDate === basis.tradingDateLabel ? 'today' : 'previous'
  const recalculationContextKey = `${bucketId}:${displaySnapshot?.snapshotId ?? 'none'}:${horizon}:${marketDataMode}`

  const createSnapshot = useCallback(() => {
    const generatedAt = new Date().toISOString()
    const dailyBasis = getDailyBasisTime(new Date(generatedAt))
    if (dailyBasis.isBeforeTodayBasis) return
    const base = buildCandidateSnapshot({ sources: snapshotSources, generatedAt, expiresAt: dailyBasis.nextDailyBasisAt, snapshotId: `daily-${bucketId}-${dailyBasis.tradingDateLabel}`, catalogSource: activeCatalogSource, providerLabel: `Daily ${bucketId}` })
    const daily = buildDailyBucketSnapshot({ bucketId, snapshotId: base?.snapshotId ?? `daily-${bucketId}-${dailyBasis.tradingDateLabel}`, generatedAt, basis: dailyBasis, items: base?.items ?? [] })
    setSnapshotRecords(saveDailyBucketSnapshot(daily))
    setClock(generatedAt)
  }, [activeCatalogSource, bucketId, snapshotSources])

  useEffect(() => {
    if (basis.isBeforeTodayBasis || activeInstruments.length === 0 || activeSnapshot?.tradingDate === basis.tradingDateLabel) return undefined
    const timer = window.setTimeout(createSnapshot, 0)
    return () => window.clearTimeout(timer)
  }, [activeInstruments.length, activeSnapshot?.tradingDate, basis.isBeforeTodayBasis, basis.tradingDateLabel, createSnapshot])

  const openSnapshotAnalysis = useCallback((instrumentId: string, snapshotId: string) => navigate(`/my-analysis?instrumentId=${encodeURIComponent(instrumentId)}&bucketId=${encodeURIComponent(bucketId)}&snapshotId=${encodeURIComponent(snapshotId)}`), [bucketId, navigate])
  const selectCandidate = useCallback((instrumentId: string) => setSelectedByBucket((current) => ({ ...current, [bucketId]: instrumentId })), [bucketId])
  const changeCandidateDisplayFilter = useCallback((filter: CandidateDisplayFilter) => {
    setCandidateDisplayFilter(filter)
    saveCandidateDisplayFilter(filter)
  }, [])
  const heldVisibility = candidateDisplayFilter === 'wider' ? 'expanded' : displayMode === 'expert' ? 'collapsed' : 'hidden'

  return <>
    <AiAnalysisTerminalLayout
      header={<MarketTerminalHeader bucketLabel={bucketLabel} displayedCount={qualityDisplayedCount} heldCount={heldCount} excludedCount={excludedCount} dataState={activeCatalogSource} snapshotStatus={snapshotStatus} bitcoinAnchorStatus={bitcoinAnchor?.status ?? null} language={language} />}
      tabs={<MarketBucketSelector selected={bucketId} language={language} onChange={setBucketId} />}
      context={<MarketContextStrip bucketId={bucketId} bucketLabel={bucketLabel} bitcoinAnchor={bitcoinAnchor} displayedCount={qualityDisplayedCount} heldCount={heldCount} excludedCount={excludedCount} heldReasonCounts={candidateQualityStatus.heldReasonCounts} excludedReasonCounts={candidateQualityStatus.excludedReasonCounts} displayFilter={candidateDisplayFilter} onDisplayFilterChange={changeCandidateDisplayFilter} dataState={activeCatalogSource} newsState={newsResult?.state ?? null} language={language} />}
      advanced={displayMode === 'expert' ? <details className={styles.advanced}><summary>{pageCopy.advanced}</summary><p>{pageCopy.advancedHelp}</p><CandidateHorizonSelector horizon={horizon} language={language} onChange={setHorizon} /></details> : undefined}
      candidateList={<CandidateTerminalList key={recalculationContextKey} snapshot={displaySnapshot} items={terminalItems} selectedInstrumentId={selectedInstrumentId} language={language} now={clock} canRecalculate={!basis.isBeforeTodayBasis && activeInstruments.length > 0} beforeTodayBasis={basis.isBeforeTodayBasis} contextKey={recalculationContextKey} heldCandidates={heldTerminalItems} heldCandidateCount={heldCount} heldVisibility={heldVisibility} onSelect={selectCandidate} onRecalculate={createSnapshot} />}
      inspector={<CandidateInspectorPanel candidate={selectedTerminalItem} snapshotId={displaySnapshot?.snapshotId ?? null} generatedAt={displaySnapshot?.generatedAt ?? null} language={language} technicalAnalysis={technicalAnalysis} technicalLoading={technicalLevelData.isLoading} onOpenAnalysis={openSnapshotAnalysis} />}
    />
    <AiUsagePlans language={language} />
  </>
}
