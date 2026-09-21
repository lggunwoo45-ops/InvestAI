import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { CryptoWatchCandidates } from '@/components/ai/CryptoWatchCandidates/CryptoWatchCandidates'
import { AiUsagePlans } from '@/components/ai/AiUsagePlans/AiUsagePlans'
import { StockWatchCandidates } from '@/components/ai/StockWatchCandidates/StockWatchCandidates'
import { BetaScopeBanner } from '@/components/demo/BetaScopeBanner/BetaScopeBanner'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildNewsInsight } from '@/services/news/newsInsightEngine'
import { getCandidateHorizonProfile } from '@/services/ai/candidateHorizonProfiles'
import type { WatchCandidateHorizon, WatchCandidateNewsSource } from '@/types/watchCandidate'
import { loadCandidateSnapshots, saveCandidateSnapshots } from '@/utils/candidateSnapshotStorage'
import styles from './AiAnalysisPage.module.css'

type CandidateAssetTab = 'crypto' | 'korea' | 'us'

export function AiAnalysisPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const { marketDataMode, setMarketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument } = useOpenNewsInstrument()
  const [retry, setRetry] = useState(0)
  const [horizon, setHorizon] = useState<WatchCandidateHorizon>('short')
  const [assetTab, setAssetTab] = useState<CandidateAssetTab>('crypto')
  const [previousSnapshots] = useState(loadCandidateSnapshots)
  const catalog = useMarketCatalog('upbit-krw', marketDataMode, retry)
  const kospi = useMarketCatalog('kospi', marketDataMode, 0)
  const kosdaq = useMarketCatalog('kosdaq', marketDataMode, 0)
  const nasdaq = useMarketCatalog('nasdaq', marketDataMode, 0)
  const nyse = useMarketCatalog('nyse', marketDataMode, 0)
  useDocumentTitle(language === 'ko' ? '관찰 후보' : 'Watch Candidates')
  const candidates = useMemo(() => buildCryptoWatchCandidates({ instruments: catalog.catalog?.instruments ?? [], newsResult, language, horizon, previousSnapshots }), [catalog.catalog, horizon, language, newsResult, previousSnapshots])
  const newsInsights = useMemo(() => [...(newsResult?.articles ?? [])].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)).slice(0, 3).map((article) => buildNewsInsight({ article, availableInstruments: candidates.map((candidate) => ({ id: candidate.instrumentId, symbol: candidate.symbol, name: candidate.name })), language })), [candidates, language, newsResult?.articles])
  const horizonProfile = useMemo(() => getCandidateHorizonProfile(horizon, language), [horizon, language])
  const koreaInstruments = useMemo(() => [...(kospi.catalog?.instruments ?? []), ...(kosdaq.catalog?.instruments ?? [])], [kosdaq.catalog?.instruments, kospi.catalog?.instruments])
  const usInstruments = useMemo(() => [...(nasdaq.catalog?.instruments ?? []), ...(nyse.catalog?.instruments ?? [])], [nasdaq.catalog?.instruments, nyse.catalog?.instruments])
  const koreaCandidates = useMemo(() => buildStockWatchCandidates({ instruments: koreaInstruments, region: 'korea', newsResult, language, horizon }), [horizon, koreaInstruments, language, newsResult])
  const usCandidates = useMemo(() => buildStockWatchCandidates({ instruments: usInstruments, region: 'us', newsResult, language, horizon }), [horizon, language, newsResult, usInstruments])
  useEffect(() => { if (candidates.length) saveCandidateSnapshots(candidates) }, [candidates])
  const newsSource: WatchCandidateNewsSource = newsResult?.source === 'local-proxy' ? 'local-proxy' : newsResult?.source === 'rss' ? 'browser-rss' : newsResult?.source === 'mock' ? 'demo' : 'none'
  const retryCatalog = useCallback(() => setRetry((value) => value + 1), [])

  const tabs = language === 'ko' ? { crypto: '가상자산', korea: '한국 주식', us: '미국 주식' } : { crypto: 'Crypto', korea: 'Korea Stocks', us: 'US Stocks' }
  const pageCopy = language === 'ko'
    ? { eyebrow: '상세 분석', title: 'Market Copilot 전문가모드', description: '관찰 후보의 근거, 시간 범위와 세부 설정을 검토합니다.' }
    : { eyebrow: 'DETAILED ANALYSIS', title: 'Market Copilot Expert Mode', description: 'Review watch-candidate evidence, time horizons, and detailed controls.' }
  return <><div className={styles.pageHeader}><header><span>{pageCopy.eyebrow}</span><h1>{pageCopy.title}</h1><p>{pageCopy.description}</p></header></div>{displayMode === 'simple' && <aside className={styles.modeNote} role="note">{uiText[language].displayMode.aiSimpleHint} <Link to="/simple">{uiText[language].displayMode.openSimple}</Link></aside>}<div className={styles.betaBanner}><BetaScopeBanner language={language} /></div><nav className={styles.assetTabs} role="tablist" aria-label={language === 'ko' ? '후보 자산 유형' : 'Candidate asset type'}>{(Object.keys(tabs) as CandidateAssetTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={assetTab === tab} onClick={() => setAssetTab(tab)}>{tabs[tab]}</button>)}</nav>
    {assetTab === 'crypto' && <CryptoWatchCandidates candidates={candidates} language={language} mode={marketDataMode} newsSource={newsSource} horizon={horizon} horizonProfile={horizonProfile} onHorizonChange={setHorizon} loading={catalog.loading} error={catalog.error}
      onOpenInstrument={openInstrument} onOpenMarket={() => navigate('/market')} onModeChange={setMarketDataMode} onRetry={retryCatalog} newsInsights={newsInsights} />}
    {assetTab === 'korea' && <StockWatchCandidates candidates={koreaCandidates} region="korea" language={language} horizon={horizon} supportedInstrumentIds={new Set(koreaInstruments.map((instrument) => instrument.id))} loading={kospi.loading || kosdaq.loading} onOpenInstrument={openInstrument} />}
    {assetTab === 'us' && <StockWatchCandidates candidates={usCandidates} region="us" language={language} horizon={horizon} supportedInstrumentIds={new Set(usInstruments.map((instrument) => instrument.id))} loading={nasdaq.loading || nyse.loading} onOpenInstrument={openInstrument} />}
    <AiUsagePlans language={language} /></>
}
