import { useNavigate } from 'react-router-dom'

import { DiscoverTable } from '@/components/discover/DiscoverTable/DiscoverTable'
import { NewsCard } from '@/components/news/NewsCard/NewsCard'
import { MarketPulseBoard } from '@/components/smart-dashboard/MarketPulseBoard/MarketPulseBoard'
import { WatchlistManager } from '@/components/smart-dashboard/WatchlistManager/WatchlistManager'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketOverview } from '@/hooks/useMarketOverview'
import { useResolvedInstruments } from '@/hooks/useResolvedInstruments'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import type { MarketInstrument } from '@/types/market'
import { getMarketSessionStatus, marketSessionLabel } from '@/utils/marketSessions'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const navigate = useNavigate()
  const dashboard = useDashboardData()
  const { sections } = useMarketOverview()
  const { selectInstrument, marketDataMode } = useMarketWorkspace()
  const { watchlists, trackRecentlyViewed } = useWatchlists()
  const resolvedInstruments = useResolvedInstruments(watchlists.flatMap((list) => list.instrumentIds), marketDataMode)
  const open = (instrument: MarketInstrument) => {
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
    navigate('/market')
  }

  if (!dashboard) return <div className={styles.loading}>Preparing smart dashboard…</div>

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>DAILY INVESTMENT WORKSPACE</span><h1>Smart Market Dashboard</h1><p>Your watchlists, global sessions, discovery signals, and market-aware news.</p></div>
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
