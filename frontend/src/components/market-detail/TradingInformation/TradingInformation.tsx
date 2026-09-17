import { memo } from 'react'

import { ConnectionIndicator } from '@/components/market-data/ConnectionIndicator/ConnectionIndicator'
import type { MarketConnectionState } from '@/types/market'
import type { MarketDetailSnapshot } from '@/types/marketDetail'
import { Orderbook } from '../Orderbook/Orderbook'
import { RecentTrades } from '../RecentTrades/RecentTrades'
import styles from './TradingInformation.module.css'

interface TradingInformationProps {
  snapshot: MarketDetailSnapshot
  connection: MarketConnectionState
}

export const TradingInformation = memo(function TradingInformation({ snapshot, connection }: TradingInformationProps) {
  const isStock = snapshot.instrument.marketId === 'korea-stock' || snapshot.instrument.marketId === 'us-stock'
  return (
    <aside className={`${styles.panel} ${isStock ? styles.stock : ''}`} aria-label="Trading information">
      <div className={styles.title}><strong>{isStock ? 'Market Activity' : 'Trading Information'}</strong><ConnectionIndicator connection={connection} compact /></div>
      <div className={styles.content}>
        <Orderbook instrument={snapshot.instrument} snapshot={snapshot.orderbook} mode={connection.effectiveMode} />
        <RecentTrades instrument={snapshot.instrument} trades={snapshot.recentTrades} mode={connection.effectiveMode} />
      </div>
    </aside>
  )
})
