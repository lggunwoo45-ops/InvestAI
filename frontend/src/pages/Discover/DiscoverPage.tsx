import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { DiscoverTable } from '@/components/discover/DiscoverTable/DiscoverTable'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import type { DiscoverAsset } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'
import styles from './DiscoverPage.module.css'

export function DiscoverPage() {
  useDocumentTitle('Discover')
  const navigate = useNavigate()
  const snapshot = useDashboardData()
  const { selectInstrument } = useMarketWorkspace()
  const { recentlyViewedIds, trackRecentlyViewed } = useWatchlists()
  const allAssets = useMemo(() => snapshot ? Object.values(snapshot.discover).flat() : [], [snapshot])
  const recent = useMemo(() => recentlyViewedIds.map((id) => allAssets.find((asset) => asset.instrumentId === id)).filter((asset): asset is DiscoverAsset => Boolean(asset)), [allAssets, recentlyViewedIds])

  const open = (instrument: MarketInstrument) => {
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
    navigate('/market')
  }

  if (!snapshot) return <div className={styles.loading}>Loading discovery intelligence…</div>
  return (
    <div className={styles.page}>
      <header className={styles.heading}><div><span>MARKET DISCOVERY</span><h1>Discover</h1><p>Scan momentum, liquidity, and the assets drawing investor attention.</p></div><div><span>UNIVERSE</span><strong>Cross-market mock intelligence</strong></div></header>
      <div className={styles.grid}>
        <DiscoverTable title="Trending" caption="Highest cross-market attention" assets={snapshot.discover.trending} onSelect={open} />
        <DiscoverTable title="Top Gainers" caption="Strongest daily momentum" assets={snapshot.discover.gainers} onSelect={open} />
        <DiscoverTable title="Top Losers" caption="Largest daily drawdowns" assets={snapshot.discover.losers} onSelect={open} />
        <DiscoverTable title="Highest Volume" caption="Leading turnover today" assets={snapshot.discover.volume} onSelect={open} />
        <div className={styles.recent}><DiscoverTable title="Recently Viewed" caption="Your latest market context" assets={recent} onSelect={open} /></div>
      </div>
    </div>
  )
}
