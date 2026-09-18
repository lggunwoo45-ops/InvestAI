import type { NewsCategory, NewsMarket } from '@/types/dashboard'

export interface RssFeedConfig {
  id: string
  label: string
  market: NewsMarket
  category: NewsCategory
  /** No URL is enabled until source rights, CORS and transport are reviewed. */
  url: string | null
  enabled: boolean
}

/** Candidate sources only. These entries cause no network activity. */
export const rssFeedConfig: readonly RssFeedConfig[] = [
  { id: 'coindesk-candidate', label: 'CoinDesk RSS (candidate)', market: 'crypto', category: 'crypto', url: null, enabled: false },
  { id: 'cointelegraph-candidate', label: 'Cointelegraph RSS (candidate)', market: 'crypto', category: 'crypto', url: null, enabled: false },
  { id: 'korea-stock-candidate', label: 'Korea Stock licensed feed (candidate)', market: 'korea', category: 'korea-stock', url: null, enabled: false },
  { id: 'us-stock-candidate', label: 'US Stock public feed (candidate)', market: 'us', category: 'us-stock', url: null, enabled: false },
  { id: 'macro-candidate', label: 'Central bank public feed (candidate)', market: 'macro', category: 'macro', url: null, enabled: false },
]
