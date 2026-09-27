import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { AiUsagePlans } from '@/components/ai/AiUsagePlans/AiUsagePlans'
import { CandidateHorizonSelector } from '@/components/candidates/CandidateHorizonSelector/CandidateHorizonSelector'
import { CandidateSnapshotPanel } from '@/components/candidates/CandidateSnapshotPanel/CandidateSnapshotPanel'
import { MarketBucketSelector } from '@/components/candidates/MarketBucketSelector/MarketBucketSelector'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildCandidateCurrentState, buildCandidateSnapshot } from '@/services/candidateSnapshot/candidateSnapshotBuilder'
import { getDailyBasisTime } from '@/services/candidateSnapshot/dailyBasisTime'
import { selectDailyBucketCandidates } from '@/services/candidateSnapshot/dailyBucketCandidateSelector'
import { buildDailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import { loadDailyBucketSnapshots, saveDailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshotStorage'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { CandidateSnapshotBuildSource } from '@/types/candidateSnapshot'
import type { MarketCatalog, MarketInstrument } from '@/types/market'
import type { MarketBucketId } from '@/types/marketBucket'
import type { WatchCandidate, WatchCandidateHorizon } from '@/types/watchCandidate'
import { loadCandidateSnapshots } from '@/utils/candidateSnapshotStorage'
import styles from './AiAnalysisPage.module.css'

const DAILY_DEFAULT_HORIZON: WatchCandidateHorizon = 'swing'

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
  const selectedCandidates = useMemo(() => selectDailyBucketCandidates(bucketId, activeCandidates, activeInstruments), [activeCandidates, activeInstruments, bucketId])
  const snapshotSources = useMemo(() => selectedCandidates.map(({ candidate, instrument }): CandidateSnapshotBuildSource => ({
    candidate,
    instrument,
    analysis: buildMyInstrumentAnalysis({ instrument, candidate, intent: 'watching', userNote: '', averagePrice: null, catalogSource: activeCatalogSource === 'live' ? 'live' : activeCatalogSource === 'mock' ? 'mock' : null, newsResult, language: 'en' }),
  })), [activeCatalogSource, newsResult, selectedCandidates])
  const activeSnapshot = snapshotRecords.find((snapshot) => snapshot.bucketId === bucketId) ?? null
  const currentStates = useMemo(() => new Map(snapshotSources.map((source) => [source.instrument.id, buildCandidateCurrentState(source)])), [snapshotSources])
  const currentPrices = useMemo(() => new Map(activeInstruments.map((instrument) => [instrument.id, instrument.lastPrice])), [activeInstruments])
  const basis = useMemo(() => getDailyBasisTime(new Date(clock)), [clock])

  const createSnapshot = useCallback(() => {
    const generatedAt = new Date().toISOString()
    const dailyBasis = getDailyBasisTime(new Date(generatedAt))
    if (dailyBasis.isBeforeTodayBasis) return
    const base = buildCandidateSnapshot({ sources: snapshotSources, generatedAt, expiresAt: dailyBasis.nextDailyBasisAt, snapshotId: `daily-${bucketId}-${dailyBasis.tradingDateLabel}`, catalogSource: activeCatalogSource, providerLabel: `Daily ${bucketId}` })
    if (!base) return
    const daily = buildDailyBucketSnapshot({ bucketId, snapshotId: base.snapshotId, generatedAt, basis: dailyBasis, items: base.items })
    if (!daily) return
    setSnapshotRecords(saveDailyBucketSnapshot(daily))
    setClock(generatedAt)
  }, [activeCatalogSource, bucketId, snapshotSources])

  useEffect(() => {
    if (basis.isBeforeTodayBasis || snapshotSources.length === 0 || activeSnapshot?.tradingDate === basis.tradingDateLabel) return undefined
    const timer = window.setTimeout(createSnapshot, 0)
    return () => window.clearTimeout(timer)
  }, [activeSnapshot?.tradingDate, basis.isBeforeTodayBasis, basis.tradingDateLabel, createSnapshot, snapshotSources.length])

  const openSnapshotAnalysis = useCallback((instrumentId: string, snapshotId: string) => navigate(`/my-analysis?instrumentId=${encodeURIComponent(instrumentId)}&bucketId=${encodeURIComponent(bucketId)}&snapshotId=${encodeURIComponent(snapshotId)}`), [bucketId, navigate])

  return <>
    <div className={styles.pageHeader}><header><span>{pageCopy.eyebrow}</span><h1>{pageCopy.title}</h1><p>{pageCopy.description}</p></header></div>
    <MarketBucketSelector selected={bucketId} language={language} onChange={setBucketId} />
    {displayMode === 'expert' && <details className={styles.advanced}><summary>{pageCopy.advanced}</summary><p>{pageCopy.advancedHelp}</p><CandidateHorizonSelector horizon={horizon} language={language} onChange={setHorizon} /></details>}
    <CandidateSnapshotPanel snapshot={activeSnapshot} currentStates={currentStates} currentPrices={currentPrices} horizon={horizon} language={language} now={clock} canRefresh={!basis.isBeforeTodayBasis && snapshotSources.length > 0} onRefresh={createSnapshot} onOpenAnalysis={openSnapshotAnalysis} variant="daily" beforeTodayBasis={basis.isBeforeTodayBasis} />
    <AiUsagePlans language={language} />
  </>
}
