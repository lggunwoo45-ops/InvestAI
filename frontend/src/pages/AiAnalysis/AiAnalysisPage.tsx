import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { AiUsagePlans } from '@/components/ai/AiUsagePlans/AiUsagePlans'
import { CandidateHorizonSelector } from '@/components/candidates/CandidateHorizonSelector/CandidateHorizonSelector'
import { CandidateSnapshotPanel } from '@/components/candidates/CandidateSnapshotPanel/CandidateSnapshotPanel'
import { BetaScopeBanner } from '@/components/demo/BetaScopeBanner/BetaScopeBanner'
import { DisplayModeNotice } from '@/components/displayMode/DisplayModeNotice/DisplayModeNotice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildCandidateCurrentState, buildCandidateSnapshot, deriveCandidateSnapshotExpiry } from '@/services/candidateSnapshot/candidateSnapshotBuilder'
import { loadCandidateSnapshotRecords, saveCandidateSnapshotRecord } from '@/services/candidateSnapshot/candidateSnapshotStorage'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { CandidateSnapshotBuildSource } from '@/types/candidateSnapshot'
import type { MarketInstrument } from '@/types/market'
import type { WatchCandidate, WatchCandidateHorizon } from '@/types/watchCandidate'
import { loadCandidateSnapshots } from '@/utils/candidateSnapshotStorage'
import styles from './AiAnalysisPage.module.css'

type CandidateAssetTab = 'crypto' | 'korea' | 'us'

export function AiAnalysisPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const { marketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const [horizon, setHorizon] = useState<WatchCandidateHorizon>('short')
  const [assetTab, setAssetTab] = useState<CandidateAssetTab>('crypto')
  const [previousSnapshots] = useState(loadCandidateSnapshots)
  const [snapshotRecords, setSnapshotRecords] = useState(loadCandidateSnapshotRecords)
  const [snapshotNow, setSnapshotNow] = useState(() => new Date().toISOString())
  const catalog = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)
  useDocumentTitle(language === 'ko' ? '관찰 후보' : 'Watch Candidates')
  const candidates = useMemo(() => buildCryptoWatchCandidates({ instruments: catalog.catalog?.instruments ?? [], newsResult, language, horizon, previousSnapshots }), [catalog.catalog, horizon, language, newsResult, previousSnapshots])
  const koreaInstruments = useMemo(() => [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], [kosdaq.catalog?.instruments, kospi.catalog?.instruments])
  const usInstruments = useMemo(() => [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], [nasdaq.catalog?.instruments, nyse.catalog?.instruments])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: koreaInstruments, region: 'korea', newsResult, language, horizon }), [horizon, koreaInstruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: usInstruments, region: 'us', newsResult, language, horizon }), [horizon, language, newsResult, usInstruments])

  const activeCandidates: readonly WatchCandidate[] = useMemo(() => assetTab === 'crypto' ? candidates : assetTab === 'korea' ? koreaCandidates : usCandidates, [assetTab, candidates, koreaCandidates, usCandidates])
  const activeInstruments: readonly MarketInstrument[] = useMemo(() => assetTab === 'crypto' ? catalog.catalog?.instruments ?? [] : assetTab === 'korea' ? koreaInstruments : usInstruments, [assetTab, catalog.catalog?.instruments, koreaInstruments, usInstruments])
  const activeCatalogSource = assetTab === 'crypto' ? catalog.catalog?.source ?? 'unavailable' : 'mock'
  const providerLabel = `${assetTab === 'crypto' ? 'Upbit KRW' : assetTab === 'korea' ? 'Korea Stock' : 'US Stock'} · ${horizon}`
  const snapshotSources = useMemo(() => activeCandidates.slice(0, 5).flatMap((candidate): CandidateSnapshotBuildSource[] => {
    const instrument = activeInstruments.find((item) => item.id === candidate.instrumentId)
    if (!instrument) return []
    const analysis = buildMyInstrumentAnalysis({ instrument, candidate, intent: 'watching', userNote: '', averagePrice: null, catalogSource: activeCatalogSource === 'live' ? 'live' : activeCatalogSource === 'mock' ? 'mock' : null, newsResult, language: 'en' })
    return [{ candidate, instrument, analysis }]
  }), [activeCandidates, activeCatalogSource, activeInstruments, newsResult])
  const activeSnapshot = snapshotRecords.find((snapshot) => snapshot.providerLabel === providerLabel) ?? null
  const currentStates = useMemo(() => new Map(snapshotSources.map((source) => [source.instrument.id, buildCandidateCurrentState(source)])), [snapshotSources])
  const currentPrices = useMemo(() => new Map(activeInstruments.map((instrument) => [instrument.id, instrument.lastPrice])), [activeInstruments])
  const createSnapshot = useCallback(() => {
    const generatedAt = new Date().toISOString()
    const snapshot = buildCandidateSnapshot({ sources: snapshotSources, generatedAt, expiresAt: deriveCandidateSnapshotExpiry(generatedAt), snapshotId: `${assetTab}-${horizon}-${generatedAt}`, catalogSource: activeCatalogSource, providerLabel })
    if (!snapshot) return
    setSnapshotRecords(saveCandidateSnapshotRecord(snapshot))
    setSnapshotNow(generatedAt)
  }, [activeCatalogSource, assetTab, horizon, providerLabel, snapshotSources])
  const openSnapshotAnalysis = useCallback((instrumentId: string, snapshotId: string) => navigate(`/my-analysis?instrumentId=${encodeURIComponent(instrumentId)}&snapshotId=${encodeURIComponent(snapshotId)}&snapshotItemId=${encodeURIComponent(instrumentId)}`), [navigate])

  const tabs = language === 'ko' ? { crypto: '가상자산', korea: '한국 주식', us: '미국 주식' } : { crypto: 'Crypto', korea: 'Korea Stocks', us: 'US Stocks' }
  const pageCopy = language === 'ko'
    ? { eyebrow: '상세 분석', title: 'Market Copilot 전문가모드', description: '관찰 후보의 근거, 시간 범위와 세부 설정을 검토합니다.' }
    : { eyebrow: 'DETAILED ANALYSIS', title: 'Market Copilot Expert Mode', description: 'Review watch-candidate evidence, time horizons, and detailed controls.' }
  return <><div className={styles.pageHeader}><header><span>{pageCopy.eyebrow}</span><h1>{pageCopy.title}</h1><p>{pageCopy.description}</p></header></div>{displayMode === 'simple' && <div className={styles.modeNote}><DisplayModeNotice variant="panel" action={{ label: uiText[language].displayMode.openSimple, to: '/simple' }}>{uiText[language].displayMode.aiSimpleHint} {uiText[language].displayMode.expertDetailed}.</DisplayModeNotice></div>}<div className={styles.betaBanner}><BetaScopeBanner language={language} /></div><nav className={styles.assetTabs} data-display-mode={displayMode} role="tablist" aria-label={language === 'ko' ? '후보 자산 유형' : 'Candidate asset type'}>{(Object.keys(tabs) as CandidateAssetTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={assetTab === tab} onClick={() => setAssetTab(tab)}>{tabs[tab]}</button>)}</nav>
    <CandidateHorizonSelector horizon={horizon} language={language} onChange={setHorizon} />
    <CandidateSnapshotPanel snapshot={activeSnapshot} currentStates={currentStates} currentPrices={currentPrices} horizon={horizon} language={language} now={snapshotNow} canRefresh={snapshotSources.length > 0} onRefresh={createSnapshot} onOpenAnalysis={openSnapshotAnalysis} />
    <AiUsagePlans language={language} /></>
}
