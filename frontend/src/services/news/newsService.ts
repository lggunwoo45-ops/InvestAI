import type { NewsArticle } from '@/types/dashboard'
import { newsProvider } from './MockNewsProvider'
import type { NewsProvider } from './NewsProvider'
import type { NewsLoadOptions } from './NewsProvider'
import { RssNewsProvider, RssProviderError, type RssFailureReason } from './RssNewsProvider'
import { LocalProxyNewsProvider } from './LocalProxyNewsProvider'
import { LiveNewsProvider, type NewsSourceStatus } from './LiveNewsProvider'

export type NewsProviderMode = 'mock' | 'rss-ready' | 'local-proxy' | 'live'
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
  sources?: readonly NewsSourceStatus[]
  checkedAt?: string
}

/** Explicit provider boundary. Live failures never fall back to example articles. */
export class NewsService {
  constructor(
    private readonly mock: NewsProvider = newsProvider,
    private readonly rss: NewsProvider = new RssNewsProvider(),
    private readonly localProxy: NewsProvider = new LocalProxyNewsProvider(),
    private readonly live = new LiveNewsProvider(),
  ) {}

  async loadNews(mode: NewsProviderMode = 'mock', options?: NewsLoadOptions): Promise<NewsLoadResult> {
    if (mode === 'live') {
      try {
        const result = await this.live.load(options)
        const fetched = result.sources.filter(source => source.state !== 'unavailable' && source.fetchedAt).map(source => source.fetchedAt!).sort()
        return {
          requestedMode: mode, state: result.articles.length ? 'rss-ready' : 'rss-unavailable',
          source: result.articles.length ? 'rss' : null, providerLabel: 'CoinDesk · Federal Reserve Board',
          articles: result.articles, lastUpdatedAt: fetched[0] ?? null,
          error: result.articles.length ? null : 'network', fallback: false,
          sources: result.sources, checkedAt: result.checkedAt,
        }
      } catch (error) {
        return { requestedMode: mode, state: 'rss-unavailable', source: null, providerLabel: 'Public RSS',
          articles: [], lastUpdatedAt: null, error: error instanceof RssProviderError ? error.reason : 'network', fallback: false }
      }
    }
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
