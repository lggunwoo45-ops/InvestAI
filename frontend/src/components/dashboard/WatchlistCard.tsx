import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { TextAction } from '@/components/TextAction/TextAction'
import styles from './WatchlistCard.module.css'

export function WatchlistCard() {
  return (
    <DashboardCard title="Watchlist" eyebrow="Tracking" icon="dashboard" action={<TextAction label="Manage" disabled />}>
      <div className={styles.columns}><span>Asset</span><span>Price</span><span>24h</span></div>
      <EmptyState compact title="No assets tracked" description="Watchlist data will appear after a market provider is connected." />
    </DashboardCard>
  )
}
