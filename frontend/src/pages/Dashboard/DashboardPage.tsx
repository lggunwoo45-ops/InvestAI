import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { DiscoverTable } from '@/components/discover/DiscoverTable/DiscoverTable'
import { BetaScopeBanner } from '@/components/demo/BetaScopeBanner/BetaScopeBanner'
import { MarketRadar } from '@/components/market/MarketRadar/MarketRadar'
import { NewsCard } from '@/components/news/NewsCard/NewsCard'
import { MarketPulseBoard } from '@/components/smart-dashboard/MarketPulseBoard/MarketPulseBoard'
import { WatchlistManager } from '@/components/smart-dashboard/WatchlistManager/WatchlistManager'
import { useDashboardData } from '@/hooks/useDashboardData'
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
import type { MarketInstrument } from '@/types/market'
import { getMarketSessionStatus, marketSessionLabel } from '@/utils/marketSessions'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { language } = useLanguage()
  useDocumentTitle(language === 'ko' ? '마켓 레이더' : 'Market Radar')
  const navigate = useNavigate()
  const dashboard = useDashboardData()
  const { sections } = useMarketOverview()
  const { selectInstrument, marketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument } = useOpenNewsInstrument()
  const catalog = useMarketCatalog('upbit-krw', marketDataMode, 0)
  const { watchlists, trackRecentlyViewed } = useWatchlists()
  const resolvedInstruments = useResolvedInstruments(watchlists.flatMap((list) => list.instrumentIds), marketDataMode)
  const radarCandidates = useMemo(() => buildCryptoWatchCandidates({ instruments: catalog.catalog?.instruments ?? [], newsResult, language, limit: 5 }), [catalog.catalog?.instruments, language, newsResult])
  const radar = useMemo(() => buildMarketRadar({ instruments: catalog.catalog?.instruments ?? [], watchCandidates: radarCandidates, newsResult, language, mode: marketDataMode }), [catalog.catalog?.instruments, language, marketDataMode, newsResult, radarCandidates])
  const open = (instrument: MarketInstrument) => {
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
    navigate('/market')
  }

  if (!dashboard) return <div className={styles.loading}>Preparing smart dashboard…</div>

  return (
    <div className={styles.page}>
      <BetaScopeBanner language={language} />
      <MarketRadar snapshot={radar} language={language} onOpenInstrument={openInstrument} />
      <header className={styles.heading}>
        <div><span>DAILY INVESTMENT WORKSPACE</span><h2>Smart Market Dashboard</h2><p>Your watchlists, global sessions, discovery signals, and market-aware news.</p></div>
        <div className={styles.session}><span>SESSION SUMMARY</span><strong>Crypto {marketSessionLabel(getMarketSessionStatus('crypto'))} · KR {marketSessionLabel(getMarketSessionStatus('korea'))} · US {marketSessionLabel(getMarketSessionStatus('us'))}</strong></div>
      </header>
      <MarketPulseBoard items={dashboard.marketPulse} />
      <section className={styles.grid} aria-label="Dashboard workspace">
        <div className={styles.watchlist}><WatchlistManager sections={sections} resolvedInstruments={resolvedInstruments} /></div>
        <div className={styles.discover}><DiscoverTable title="Trending Now" caption="Highest cross-market attention" assets={dashboard.discover.trending} onSelect={open} /></div>
        <section className={styles.news} aria-labelledby="dashboard-news"><header><div><span>MARKET-AWARE FEED</span><h2 id="dashboard-news">Latest News</h2></div><button type="button" onClick={() => navigate('/news')}>Open News Center →</button></header><div>{dashboard.news.slice(0, 3).map((article) => <NewsCard key={article.id} article={article} />)}</div></section>
      </section>
    </div>
  )
}
