import { memo } from 'react'

import type { MarketDetailSnapshot } from '@/types/marketDetail'
import { Orderbook } from '../Orderbook/Orderbook'
import { RecentTrades } from '../RecentTrades/RecentTrades'
import styles from './TradingInformation.module.css'

interface TradingInformationProps {
  snapshot: MarketDetailSnapshot
}

export const TradingInformation = memo(function TradingInformation({ snapshot }: TradingInformationProps) {
  return (
    <aside className={styles.panel} aria-label="Trading information">
      <div className={styles.title}><strong>Trading Information</strong><span>Read-only</span></div>
      <div className={styles.content}>
        <Orderbook instrument={snapshot.instrument} snapshot={snapshot.orderbook} />
        <RecentTrades instrument={snapshot.instrument} trades={snapshot.recentTrades} />
      </div>
    </aside>
  )
})
