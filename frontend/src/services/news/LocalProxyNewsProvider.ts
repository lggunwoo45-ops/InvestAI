import type { NewsArticle, NewsCategory, NewsImportance, NewsMarket, NewsSentiment } from '@/types/dashboard'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import type { NewsLoadOptions, NewsProvider } from './NewsProvider'
import { RssProviderError } from './RssNewsProvider'

export const localNewsProxyEndpoint = 'http://localhost:8787/api/news/rss?source=fed-press'
const timeoutMs = 9_000
const categories = new Set<NewsCategory>(['crypto', 'korea-stock', 'us-stock', 'macro', 'technology', 'ai', 'earnings', 'regulation'])
const markets = new Set<NewsMarket>(['crypto', 'korea', 'us', 'macro'])
const sentiments = new Set<NewsSentiment>(['positive', 'neutral', 'negative', 'unassessed'])
const importance = new Set<NewsImportance>(['low', 'medium', 'high', 'unassessed'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function parseArticle(value: unknown): NewsArticle | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.summary !== 'string'
    || typeof value.source !== 'string' || typeof value.publishedAt !== 'string' || value.isMock !== false
    || !categories.has(value.category as NewsCategory) || !sentiments.has(value.sentiment as NewsSentiment)
    || !importance.has(value.importance as NewsImportance) || !Array.isArray(value.relatedMarkets)
    || !value.relatedMarkets.every((item) => markets.has(item as NewsMarket)) || !Array.isArray(value.relatedSymbols)
    || !value.relatedSymbols.every((item) => typeof item === 'string') || !Number.isFinite(new Date(value.publishedAt).getTime())) return null
  const url = typeof value.url === 'string' ? safeNewsUrl(value.url) : undefined
  if (typeof value.url === 'string' && !url) return null
  return {
    id: value.id.slice(0, 200), title: value.title.slice(0, 300), summary: value.summary.slice(0, 800), source: value.source.slice(0, 80),
    publishedAt: new Date(value.publishedAt).toISOString(), category: value.category as NewsCategory,
    relatedMarkets: value.relatedMarkets as NewsMarket[], relatedSymbols: value.relatedSymbols,
    sentiment: value.sentiment as NewsSentiment, importance: value.importance as NewsImportance, isMock: false,
    ...(url ? { url } : {}),
  }
}

/** Optional localhost-only provider. The application remains functional when it is absent. */
export class LocalProxyNewsProvider implements NewsProvider {
  readonly id = 'local-proxy-experimental'
  readonly label = 'Federal Reserve Board · Local Proxy'
  readonly type = 'rss' as const

  constructor(private readonly endpoint = localNewsProxyEndpoint, private readonly fetchImpl?: typeof fetch) {}

  async loadNews(options?: NewsLoadOptions): Promise<readonly NewsArticle[]> {
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    if (options?.signal?.aborted) controller.abort()
    options?.signal?.addEventListener('abort', onAbort, { once: true })
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
    try {
      const response = await (this.fetchImpl ?? fetch)(this.endpoint, { method: 'GET', signal: controller.signal, credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new RssProviderError('http')
      const payload: unknown = await response.json()
      if (!isRecord(payload) || payload.source !== 'fed-press' || payload.status !== 'ok' || payload.fallbackUsed !== false || !Array.isArray(payload.articles)) throw new RssProviderError('invalid-feed')
      const articles = payload.articles.map(parseArticle)
      if (!articles.length || articles.some((article) => article === null)) throw new RssProviderError('invalid-feed')
      return articles as NewsArticle[]
    } catch (error) {
      if (error instanceof RssProviderError) throw error
      throw new RssProviderError(timedOut ? 'timeout' : 'network')
    } finally {
      clearTimeout(timer)
      options?.signal?.removeEventListener('abort', onAbort)
    }
  }
}
