import type { MarketRegion } from '@/types/dashboard'
import { getMarketSessionStatus, marketSessionLabel } from '@/utils/marketSessions'
import styles from './MarketStatusStrip.module.css'

const markets: readonly { region: MarketRegion; label: string }[] = [
  { region: 'crypto', label: 'Crypto' }, { region: 'korea', label: 'Korea' }, { region: 'us', label: 'US' },
]

interface MarketStatusStripProps { now: Date }

export function MarketStatusStrip({ now }: MarketStatusStripProps) {
  return <div className={styles.strip} aria-label="Market sessions">{markets.map((market) => { const status = getMarketSessionStatus(market.region, now); return <span key={market.region} data-status={status}><i />{market.label}<strong>{marketSessionLabel(status)}</strong></span> })}</div>
}
