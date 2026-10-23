import { useMemo, useState } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { Link } from 'react-router-dom'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { AnalysisWarmup } from '@/components/market/AnalysisWarmup'
import { ScenarioBoard } from '@/components/scenarios/ScenarioBoard'
import { MarketRadar } from '@/components/market/MarketRadar/MarketRadar'
import { WatchlistManager } from '@/components/smart-dashboard/WatchlistManager/WatchlistManager'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketOverview } from '@/hooks/useMarketOverview'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { useResolvedInstruments } from '@/hooks/useResolvedInstruments'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildMarketRadar } from '@/services/market/marketRadarEngine'
import { loadLastMarketInstrumentIds } from '@/pages/Market/marketAssetMode'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import styles from './DashboardPage.module.css'

function SavedWatchlists() {
  const { sections } = useMarketOverview()
  const { marketDataMode } = useMarketWorkspace()
  const { watchlists } = useWatchlists()
  const resolvedInstruments = useResolvedInstruments(watchlists.flatMap(list => list.instrumentIds), marketDataMode)
  return <WatchlistManager sections={sections} resolvedInstruments={resolvedInstruments} />
}

export function DashboardPage() {
  const simple = useDisplayMode().displayMode === 'simple'
  const { language } = useLanguage()
  const ko = language === 'ko'
  useDocumentTitle(ko ? '홈' : 'Home')
  const { marketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument } = useOpenNewsInstrument()
  const catalog = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const [lastInstrument] = useState(() => loadLastMarketInstrumentIds().crypto)
  const warmInstrument = catalog.catalog?.instruments.find(item => item.id === lastInstrument)
    ?? catalog.catalog?.instruments.find(item => item.id === 'upbit-btc')
  const [watchlistsOpen, setWatchlistsOpen] = useState(false)
  const headlines = newsResult?.articles.filter(article => marketDataMode === 'mock' || !article.isMock) ?? []
  const candidates = useMemo(() => buildCryptoWatchCandidates({ instruments: catalog.catalog?.instruments ?? [], newsResult, language, limit: 5 }), [catalog.catalog?.instruments, language, newsResult])
  const radar = useMemo(() => buildMarketRadar({ instruments: catalog.catalog?.instruments ?? [], watchCandidates: candidates, newsResult, language, mode: marketDataMode }), [catalog.catalog?.instruments, language, marketDataMode, newsResult, candidates])
  return <div className={styles.page}>
    <header className={styles.heading}><h1>{ko ? '홈' : 'Home'}</h1><p>{ko ? '내 투자부터 확인하고, 궁금한 종목을 이어서 살펴보세요.' : 'Start with your investments, then explore an asset.'}</p></header>
    <PortfolioSummaryCard />
    <nav className={styles.shortcuts} aria-label={ko ? '무엇을 확인할까요?' : 'What would you like to review?'}>
      <Link to="/my-analysis"><span>01</span><strong>{ko ? '종목 분석' : 'Instrument Analysis'}</strong><p>{ko ? '한 종목의 흐름과 확인할 가격' : 'One asset’s trend and price levels'}</p></Link>
      <Link to="/portfolio"><span>02</span><strong>{ko ? '내 투자' : 'My Investments'}</strong><p>{ko ? '내가 가진 코인 전체의 손익과 분석' : 'Returns and analysis for all my holdings'}</p></Link>
      <Link to="/ai-analysis"><span>03</span><strong>{ko ? '종목 찾기' : 'Find Assets'}</strong><p>{ko ? '새로 살펴볼 코인 후보 찾기' : 'Find new coins to review'}</p></Link>
      <Link to="/research"><span>04</span><strong>{simple ? (ko ? '시장·기록' : 'Market & Reviews') : (ko ? '시장·리스크 연구실' : 'Market & Risk Lab')}</strong><p>{simple ? (ko ? '시장 요약·검토 기록·조건 알림' : 'Market summary, saved reviews and alerts') : (ko ? '시장 지표·거래비용·검토 변화 확인' : 'Market context, trading costs and review changes')}</p></Link>
    </nav>
    <details className={styles.section}><summary>{ko ? '저장한 가격 기준에 변화가 있나요?' : 'Changes to my saved price plans'}</summary><ScenarioBoard compact /></details>
    <details className={styles.section} onToggle={event => setWatchlistsOpen(event.currentTarget.open)}><summary>{ko ? '내 관심종목' : 'My watchlists'}</summary>{watchlistsOpen && <SavedWatchlists />}</details>
    <details className={styles.section}><summary>{ko ? '시장 흐름 자세히 보기' : 'Explore the market overview'}</summary><MarketRadar snapshot={radar} language={language} simpleMode onOpenInstrument={openInstrument} /></details>
    <section className={styles.news} aria-label={ko ? '최근 뉴스' : 'Recent news'}><header><h2>{ko ? '최근 뉴스' : 'Recent news'}</h2><Link to="/news">{ko ? '뉴스 전체 보기' : 'All news'} →</Link></header>
      {headlines.length ? <ul>{headlines.slice(0, 3).map(article => <li key={article.id}><strong>{safeNewsUrl(article.url) ? <a href={safeNewsUrl(article.url)!} target="_blank" rel="noreferrer">{article.title} ↗</a> : article.title}</strong><span>{article.isMock ? (ko ? '예시 뉴스 · ' : 'Demo news · ') : ''}{article.source} · {new Date(article.publishedAt).toLocaleString(ko ? 'ko-KR' : 'en-US')}</span></li>)}</ul> : <p>{ko ? '뉴스를 아직 가져오지 못했어요. 뉴스 메뉴에서 연결 상태를 확인할 수 있어요.' : 'News is not available yet. Check the connection in News.'}</p>}
    </section>
    {marketDataMode === 'live' && catalog.catalog?.source === 'live' && warmInstrument && <div className={styles.warmup}><AnalysisWarmup key={warmInstrument.id} instrument={warmInstrument} language={language} /></div>}
  </div>
}
