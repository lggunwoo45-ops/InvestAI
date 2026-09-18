import type { NewsArticle } from '@/types/dashboard'
import type { NewsLoadOptions, NewsProvider } from './NewsProvider'
import { rssFeedConfig, type RssFeedConfig } from './rssFeedConfig'

/** No fetch, proxy, or browser CORS bypass is installed in Sprint 8.3. */
export class RssNewsProvider implements NewsProvider {
  readonly id = 'rss-foundation'
  readonly label = 'RSS Provider'
  readonly type = 'rss' as const

  constructor(readonly feeds: readonly RssFeedConfig[] = rssFeedConfig) {}

  loadNews(_options?: NewsLoadOptions): Promise<readonly NewsArticle[]> {
    return Promise.reject(new Error('RSS provider not configured: approved feed URLs and transport are required.'))
  }
}
