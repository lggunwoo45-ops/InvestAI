import type { NewsArticle } from '@/types/dashboard'
import { newsProvider } from './MockNewsProvider'
import type { NewsProvider } from './NewsProvider'
import { RssNewsProvider } from './RssNewsProvider'

export type NewsProviderMode = 'mock' | 'rss-ready'
export type NewsProviderState = 'mock' | 'rss-ready' | 'rss-unavailable' | 'provider-not-configured'

export interface NewsLoadResult {
  requestedMode: NewsProviderMode
  state: NewsProviderState
  source: 'mock' | 'rss' | null
  providerLabel: string
  articles: readonly NewsArticle[]
  lastUpdatedAt: string | null
  error: 'rss-unavailable' | 'provider-not-configured' | null
  fallback: boolean
}

/** Mock is the only active default. RSS has no transport and always falls back visibly. */
export class NewsService {
  constructor(
    private readonly mock: NewsProvider = newsProvider,
    private readonly rss: NewsProvider = new RssNewsProvider(),
  ) {}

  async loadNews(mode: NewsProviderMode = 'mock'): Promise<NewsLoadResult> {
    if (mode === 'rss-ready') {
      try {
        const articles = await this.rss.loadNews()
        return { requestedMode: mode, state: 'rss-ready', source: 'rss', providerLabel: this.rss.label, articles, lastUpdatedAt: new Date().toISOString(), error: null, fallback: false }
      } catch {
        try {
          const articles = await this.mock.loadNews()
          return { requestedMode: mode, state: 'rss-unavailable', source: 'mock', providerLabel: this.mock.label, articles, lastUpdatedAt: null, error: 'rss-unavailable', fallback: true }
        } catch {
          return { requestedMode: mode, state: 'provider-not-configured', source: null, providerLabel: this.rss.label, articles: [], lastUpdatedAt: null, error: 'provider-not-configured', fallback: false }
        }
      }
    }
    try {
      const articles = await this.mock.loadNews()
      return { requestedMode: mode, state: 'mock', source: 'mock', providerLabel: this.mock.label, articles, lastUpdatedAt: null, error: null, fallback: false }
    } catch {
      return { requestedMode: mode, state: 'provider-not-configured', source: null, providerLabel: this.mock.label, articles: [], lastUpdatedAt: null, error: 'provider-not-configured', fallback: false }
    }
  }
}

export const newsService = new NewsService()
