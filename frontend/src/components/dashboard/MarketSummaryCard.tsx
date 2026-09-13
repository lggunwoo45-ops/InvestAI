import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import styles from './MarketSummaryCard.module.css'

const markets = ['Crypto', 'Korea', 'United States'] as const

export function MarketSummaryCard() {
  return (
    <DashboardCard title="Market Summary" eyebrow="Overview" icon="markets">
      <div className={styles.markets}>
        {markets.map((market) => (
          <div className={styles.market} key={market}>
            <span>{market}</span><strong>—</strong><small>Awaiting market data</small>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}
