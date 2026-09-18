import type { NewsCategory, NewsMarket } from '@/types/dashboard'

export interface RssFeedConfig {
  id: string
  label: string
  market: NewsMarket
  category: NewsCategory
  /** Only explicitly reviewed HTTPS feeds may be enabled. Browser CORS may still block them. */
  url: string | null
  enabled: boolean
}

/** One official public feed is opt-in through RSS Experimental; all other candidates stay disabled. */
export const rssFeedConfig: readonly RssFeedConfig[] = [
  { id: 'fed-press', label: 'Federal Reserve Board', market: 'macro', category: 'macro', url: 'https://www.federalreserve.gov/feeds/press_all.xml', enabled: true },
  { id: 'coindesk-candidate', label: 'CoinDesk RSS (candidate)', market: 'crypto', category: 'crypto', url: null, enabled: false },
  { id: 'cointelegraph-candidate', label: 'Cointelegraph RSS (candidate)', market: 'crypto', category: 'crypto', url: null, enabled: false },
  { id: 'korea-stock-candidate', label: 'Korea Stock licensed feed (candidate)', market: 'korea', category: 'korea-stock', url: null, enabled: false },
  { id: 'us-stock-candidate', label: 'US Stock public feed (candidate)', market: 'us', category: 'us-stock', url: null, enabled: false },
  { id: 'macro-candidate', label: 'Central bank public feed (candidate)', market: 'macro', category: 'macro', url: null, enabled: false },
]
