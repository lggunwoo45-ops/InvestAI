import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import styles from './PortfolioSummaryCard.module.css'

export function PortfolioSummaryCard() {
  return (
    <DashboardCard title="Portfolio Summary" eyebrow="All accounts" icon="portfolio">
      <div className={styles.summary}>
        <div><span>Total value</span><strong>—</strong></div>
        <div className={styles.metrics}><p><span>Day P&amp;L</span><b>—</b></p><p><span>Available</span><b>—</b></p></div>
        <small>Connect an account to populate portfolio metrics.</small>
      </div>
    </DashboardCard>
  )
}
