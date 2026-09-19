import type { NewsArticle } from '@/types/dashboard'
import { newsProvider } from './MockNewsProvider'
import type { NewsProvider } from './NewsProvider'
import type { NewsLoadOptions } from './NewsProvider'
import { RssNewsProvider, RssProviderError, type RssFailureReason } from './RssNewsProvider'
import { LocalProxyNewsProvider } from './LocalProxyNewsProvider'

export type NewsProviderMode = 'mock' | 'rss-ready' | 'local-proxy'
export type NewsProviderState = 'mock' | 'rss-ready' | 'rss-unavailable' | 'local-proxy-ready' | 'local-proxy-unavailable' | 'provider-not-configured'

export interface NewsLoadResult {
  requestedMode: NewsProviderMode
  state: NewsProviderState
  source: 'mock' | 'rss' | 'local-proxy' | null
  providerLabel: string
  articles: readonly NewsArticle[]
  lastUpdatedAt: string | null
  error: RssFailureReason | 'provider-not-configured' | null
  fallback: boolean
}

/** Mock remains the default; the real-feed experiment is opt-in and never mixes sources. */
export class NewsService {
  constructor(
    private readonly mock: NewsProvider = newsProvider,
    private readonly rss: NewsProvider = new RssNewsProvider(),
    private readonly localProxy: NewsProvider = new LocalProxyNewsProvider(),
  ) {}

  async loadNews(mode: NewsProviderMode = 'mock', options?: NewsLoadOptions): Promise<NewsLoadResult> {
    if (mode === 'local-proxy') {
      try {
        const articles = await this.localProxy.loadNews(options)
        if (!articles.length || articles.some((article) => article.isMock)) throw new RssProviderError('invalid-feed')
        return { requestedMode: mode, state: 'local-proxy-ready', source: 'local-proxy', providerLabel: this.localProxy.label, articles, lastUpdatedAt: new Date().toISOString(), error: null, fallback: false }
      } catch (error) {
        try {
          const articles = await this.mock.loadNews()
          return { requestedMode: mode, state: 'local-proxy-unavailable', source: 'mock', providerLabel: this.localProxy.label, articles, lastUpdatedAt: null, error: error instanceof RssProviderError ? error.reason : 'network', fallback: true }
        } catch {
          return { requestedMode: mode, state: 'provider-not-configured', source: null, providerLabel: this.localProxy.label, articles: [], lastUpdatedAt: null, error: 'provider-not-configured', fallback: false }
        }
      }
    }
    if (mode === 'rss-ready') {
      try {
        const articles = await this.rss.loadNews(options)
        if (!articles.length || articles.some((article) => article.isMock)) throw new RssProviderError('invalid-feed')
        return { requestedMode: mode, state: 'rss-ready', source: 'rss', providerLabel: this.rss.label, articles, lastUpdatedAt: new Date().toISOString(), error: null, fallback: false }
      } catch (error) {
        try {
          const articles = await this.mock.loadNews()
          return { requestedMode: mode, state: 'rss-unavailable', source: 'mock', providerLabel: this.mock.label, articles, lastUpdatedAt: null, error: error instanceof RssProviderError ? error.reason : 'network', fallback: true }
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
