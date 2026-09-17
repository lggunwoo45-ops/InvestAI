import { memo } from 'react'

import type { DiscoverAsset } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from '@/utils/formatMarketValue'
import styles from './DiscoverTable.module.css'

interface DiscoverTableProps {
  title: string
  caption: string
  assets: readonly DiscoverAsset[]
  onSelect: (instrument: MarketInstrument) => void
}

export const DiscoverTable = memo(function DiscoverTable({ title, caption, assets, onSelect }: DiscoverTableProps) {
  return (
    <section className={styles.panel}>
      <header><div><h2>{title}</h2><p>{caption}</p></div><span>{assets.length} assets</span></header>
      <div className={styles.scroller} tabIndex={0} aria-label={`${title} market table`}>
        <div className={styles.table}>
          <div className={styles.head}><span>Asset</span><span>Last</span><span>24H</span><span>Volume</span></div>
          {assets.map((asset, index) => {
            const instrument: MarketInstrument = asset.instrument ?? { id: asset.instrumentId, marketId: asset.marketId, symbol: asset.symbol, name: asset.name, quoteCurrency: asset.quote, lastPrice: asset.price, change24hPercent: asset.changePercent, volume24h: asset.volume }
            return (
              <button key={asset.id} type="button" className={styles.row} disabled={asset.unavailable} onClick={() => onSelect(instrument)}>
                <span className={styles.asset}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span></span>
                <span>{asset.unavailable ? '—' : formatMarketPrice(instrument)}</span>
                <span className={asset.changePercent >= 0 ? styles.positive : styles.negative}>{asset.unavailable ? '—' : formatMarketChange(asset.changePercent)}</span>
                <span>{asset.unavailable ? '—' : formatMarketVolume(asset.volume, asset.quote)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
})
