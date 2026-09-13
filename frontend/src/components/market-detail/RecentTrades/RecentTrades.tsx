import { memo } from 'react'

import type { MarketInstrument } from '@/types/market'
import type { RecentTrade } from '@/types/marketDetail'
import { formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './RecentTrades.module.css'

interface RecentTradesProps {
  instrument: MarketInstrument
  trades: readonly RecentTrade[]
}

export const RecentTrades = memo(function RecentTrades({ instrument, trades }: RecentTradesProps) {
  return (
    <section className={styles.trades} aria-labelledby="recent-trades-title">
      <header><h2 id="recent-trades-title">Recent Trades</h2><span>Simulated</span></header>
      <div className={styles.columns}><span>Time</span><span>Price</span><span>Amount</span></div>
      <div className={styles.rows}>
        {trades.map((trade) => (
          <div key={trade.id} className={styles.row}>
            <span>{new Date(trade.timestamp).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}</span>
            <strong className={trade.side === 'buy' ? styles.buy : styles.sell}>{formatMarketPrice({ ...instrument, lastPrice: trade.price })}</strong>
            <span>{trade.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </section>
  )
})
