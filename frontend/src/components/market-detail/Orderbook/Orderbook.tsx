import { memo } from 'react'

import type { MarketInstrument } from '@/types/market'
import type { OrderbookSnapshot } from '@/types/marketDetail'
import { formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './Orderbook.module.css'

interface OrderbookProps {
  instrument: MarketInstrument
  snapshot: OrderbookSnapshot
}

export const Orderbook = memo(function Orderbook({ instrument, snapshot }: OrderbookProps) {
  const formatPrice = (price: number) => formatMarketPrice({ ...instrument, lastPrice: price })
  const maximumAmount = Math.max(...snapshot.asks.map((level) => level.amount), ...snapshot.bids.map((level) => level.amount))

  return (
    <section className={styles.orderbook} aria-labelledby="orderbook-title">
      <header><h2 id="orderbook-title">Orderbook</h2><span>Top 10 · Mock</span></header>
      <div className={styles.columns}><span>Price</span><span>Amount</span><span>Total</span></div>
      <div className={styles.levels}>
        {snapshot.asks.map((level) => (
          <div key={`ask-${level.price}`} className={`${styles.level} ${styles.ask}`}>
            <i style={{ width: `${(level.amount / maximumAmount) * 100}%` }} />
            <span>{formatPrice(level.price)}</span><span>{level.amount.toFixed(4)}</span><span>{level.total.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</span>
          </div>
        ))}
        <div className={styles.spread}><span>Spread</span><strong>{snapshot.spread.toLocaleString()}</strong></div>
        {snapshot.bids.map((level) => (
          <div key={`bid-${level.price}`} className={`${styles.level} ${styles.bid}`}>
            <i style={{ width: `${(level.amount / maximumAmount) * 100}%` }} />
            <span>{formatPrice(level.price)}</span><span>{level.amount.toFixed(4)}</span><span>{level.total.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</span>
          </div>
        ))}
      </div>
    </section>
  )
})
