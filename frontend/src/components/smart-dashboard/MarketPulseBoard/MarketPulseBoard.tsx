import { memo, useMemo } from 'react'

import type { MarketPulseItem, MarketRegion } from '@/types/dashboard'
import { getMarketSessionStatus, marketSessionLabel } from '@/utils/marketSessions'
import styles from './MarketPulseBoard.module.css'

interface MarketPulseBoardProps {
  items: readonly MarketPulseItem[]
}

const regions: readonly { id: MarketRegion; label: string }[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'korea', label: 'Korea' },
  { id: 'us', label: 'US' },
]

function formatPrice(item: MarketPulseItem) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: item.price < 10 ? 2 : 0 }).format(item.price)
}

export const MarketPulseBoard = memo(function MarketPulseBoard({ items }: MarketPulseBoardProps) {
  const groups = useMemo(() => regions.map((region) => ({ ...region, items: items.filter((item) => item.region === region.id) })), [items])

  return (
    <section className={styles.board} aria-labelledby="market-pulse-title">
      <header><div><span>GLOBAL SESSION MAP</span><h2 id="market-pulse-title">Market Overview</h2></div><p>Daily cross-market pulse</p></header>
      <div className={styles.groups}>
        {groups.map((group) => {
          const status = getMarketSessionStatus(group.id)
          return (
            <div key={group.id} className={styles.group}>
              <div className={styles.groupTitle}><strong>{group.label}</strong><span data-status={status}>{marketSessionLabel(status)}</span></div>
              <div className={styles.items}>
                {group.items.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <span><strong>{item.symbol}</strong><small>{item.name}</small></span>
                    <span className={styles.quote}><strong>{formatPrice(item)}</strong><small className={item.changePercent >= 0 ? styles.positive : styles.negative}>{item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%</small></span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
})
