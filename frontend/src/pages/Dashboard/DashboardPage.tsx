import { AiConfidenceCard } from '@/components/dashboard/AiConfidenceCard'
import { LatestNewsCard } from '@/components/dashboard/LatestNewsCard'
import { MarketSummaryCard } from '@/components/dashboard/MarketSummaryCard'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { RecentSignalsCard } from '@/components/dashboard/RecentSignalsCard'
import { WatchlistCard } from '@/components/dashboard/WatchlistCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  useDocumentTitle('Dashboard')

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>Command center</span><h1>Dashboard</h1><p>Unified market intelligence and portfolio operations.</p></div>
        <div className={styles.session}><span>Market session</span><strong>Not connected</strong></div>
      </header>
      <section className={styles.grid} aria-label="Dashboard overview">
        <div className={styles.market}><MarketSummaryCard /></div>
        <div className={styles.watchlist}><WatchlistCard /></div>
        <div className={styles.portfolio}><PortfolioSummaryCard /></div>
        <div className={styles.aiConfidence}><AiConfidenceCard /></div>
        <div className={styles.news}><LatestNewsCard /></div>
        <div className={styles.signals}><RecentSignalsCard /></div>
      </section>
    </div>
  )
}
