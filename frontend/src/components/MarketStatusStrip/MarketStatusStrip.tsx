import type { MarketRegion } from '@/types/dashboard'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { getMarketSessionStatus } from '@/utils/marketSessions'
import styles from './MarketStatusStrip.module.css'

const markets: readonly MarketRegion[] = ['crypto', 'korea', 'us']

interface MarketStatusStripProps { now: Date }

export function MarketStatusStrip({ now }: MarketStatusStripProps) {
  const { language } = useLanguage()
  const text = uiText[language]
  return <div className={styles.strip} aria-label={text.marketSessions}>{markets.map((region) => { const status = getMarketSessionStatus(region, now); return <span key={region} data-status={status}><i />{text.sessions[region]}<strong>{text.sessions[status]}</strong></span> })}</div>
}
