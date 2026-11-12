import { productPageNames } from '@/app/navigation'
import { useMemo, useState } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { Link } from 'react-router-dom'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { ResearchResume } from '@/components/dashboard/ResearchResume'
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
import { SimpleHome } from '@/pages/SimpleMode/SimpleHome'

function SavedWatchlists() {
  const { sections } = useMarketOverview()
  const { marketDataMode } = useMarketWorkspace()
  const { watchlists } = useWatchlists()
  const resolvedInstruments = useResolvedInstruments(watchlists.flatMap(list => list.instrumentIds), marketDataMode)
  return <WatchlistManager sections={sections} resolvedInstruments={resolvedInstruments} />
}

export function DashboardPage() {
  return useDisplayMode().displayMode === 'simple' ? <SimpleHome /> : <DashboardOverview />
}

function DashboardOverview() {
  const { language } = useLanguage()
  const ko = language === 'ko'
  useDocumentTitle(productPageNames.home[language])
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
    <header className={styles.heading}><h1>{productPageNames.home[language]}</h1><p>{ko ? '지난 기록을 이어보고, 내 투자와 궁금한 종목을 확인하세요.' : 'Continue your saved research, check your investments, and explore an asset.'}</p></header>
    <ResearchResume />
    <PortfolioSummaryCard />
    <nav className={styles.shortcuts} aria-label={ko ? '무엇을 확인할까요?' : 'What would you like to review?'}>
      <Link to="/ai-analysis"><span>01</span><strong>{ko ? '종목 찾기' : 'Discover'}</strong><p>{ko ? '새로 살펴볼 후보와 근거 확인' : 'Find candidates and review their evidence'}</p></Link>
      <Link to="/portfolio"><span>02</span><strong>{ko ? '내 종목' : 'Holdings'}</strong><p>{ko ? '보유 종목의 손익과 현재 분석' : 'Returns and current analysis for my holdings'}</p></Link>
      <Link to="/review-alerts"><span>03</span><strong>{ko ? '알림' : 'Alerts'}</strong><p>{ko ? '정해둔 가격과 조건의 변화 확인' : 'Follow changes to saved prices and conditions'}</p></Link>
      <Link to="/results"><span>04</span><strong>{productPageNames.results[language]}</strong><p>{ko ? '저장한 후보의 이후 결과 비교' : 'Compare outcomes after recording candidates'}</p></Link>
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
