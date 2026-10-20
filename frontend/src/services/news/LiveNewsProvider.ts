import { runtimeConfig } from '@/config/runtimeConfig'
import type { NewsArticle } from '@/types/dashboard'
import { parseArticle } from './LocalProxyNewsProvider'
import type { NewsLoadOptions } from './NewsProvider'
import { RssProviderError } from './RssNewsProvider'

export interface NewsSourceStatus {
  id: string
  label: string
  state: 'ready' | 'stale' | 'unavailable'
  fetchedAt: string | null
  count: number
}
export interface LiveNewsFeed {
  articles: readonly NewsArticle[]
  sources: readonly NewsSourceStatus[]
  checkedAt: string
}
const approved = { coindesk: { label: 'CoinDesk', host: 'coindesk.com' }, 'fed-press': { label: 'Federal Reserve Board', host: 'federalreserve.gov' } }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function liveNewsEndpoint(base = runtimeConfig.newsProxyUrl): string | null {
  try {
    const url = new URL(base)
    const local = ['localhost', '127.0.0.1'].includes(url.hostname)
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    return new URL('/api/news/headlines', url).href
  } catch { return null }
}

export function parseLiveFeed(value: unknown): LiveNewsFeed {
  if (!record(value) || value.version !== 1 || value.source !== 'public-rss' || value.fallbackUsed !== false
    || !['ready', 'partial', 'unavailable'].includes(String(value.status)) || !date(value.checkedAt)
    || !Array.isArray(value.sources) || value.sources.length !== 2
    || !Array.isArray(value.articles) || value.articles.length > 100) throw new RssProviderError('invalid-feed')
  const checked = Date.parse(value.checkedAt)
  const seen = new Set<string>()
  const sources: NewsSourceStatus[] = value.sources.map((item: unknown) => {
    if (!record(item) || typeof item.id !== 'string' || !Object.hasOwn(approved, item.id) || seen.has(item.id)
      || item.label !== approved[item.id as keyof typeof approved].label
      || !['ready', 'stale', 'unavailable'].includes(String(item.state))
      || !Number.isInteger(item.count) || Number(item.count) < 0 || Number(item.count) > 50
      || !(item.fetchedAt === null || date(item.fetchedAt))) throw new RssProviderError('invalid-feed')
    seen.add(item.id)
    const age = item.fetchedAt === null ? Infinity : checked - Date.parse(item.fetchedAt as string)
    if (item.state !== 'unavailable' && (age < 0 || age > 1_800_000 || (item.state === 'ready' && age >= 300_000))) throw new RssProviderError('invalid-feed')
    return { id: item.id, label: item.label as string, state: item.state as NewsSourceStatus['state'], fetchedAt: item.fetchedAt as string | null, count: Number(item.count) }
  })
  const ids = new Set<string>(), urls = new Set<string>()
  const articles = value.articles.map((item: unknown) => {
    const article = parseArticle(item)
    const source = article && sources.find(s => s.label === article.source && s.state !== 'unavailable')
    if (!article || !source || !article.url || Date.parse(article.publishedAt) > checked + 300_000
      || article.summary !== '' || article.sentiment !== 'unassessed' || article.importance !== 'unassessed'
      || ids.has(article.id) || urls.has(article.url)) throw new RssProviderError('invalid-feed')
    const url = new URL(article.url), host = approved[source.id as keyof typeof approved].host
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !(url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new RssProviderError('invalid-feed')
    ids.add(article.id); urls.add(article.url)
    return article
  })
  for (const source of sources) if (articles.filter(a => a.source === source.label).length !== source.count) throw new RssProviderError('invalid-feed')
  const status = sources.every(source => source.state === 'ready') ? 'ready' : articles.length ? 'partial' : 'unavailable'
  if (value.status !== status) throw new RssProviderError('invalid-feed')
  return { articles, sources, checkedAt: value.checkedAt }
}

export class LiveNewsProvider {
  constructor(private readonly endpoint = liveNewsEndpoint(), private readonly fetchImpl?: typeof fetch) {}
  async load(options?: NewsLoadOptions): Promise<LiveNewsFeed> {
    if (!this.endpoint) throw new RssProviderError('not-configured')
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (options?.signal?.aborted) controller.abort()
    options?.signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, 10_000)
    try {
      const response = await (this.fetchImpl ?? fetch)(this.endpoint, { credentials: 'omit', signal: controller.signal, cache: 'no-store' })
      if (!response.ok && response.status !== 503) throw new RssProviderError('http')
      return parseLiveFeed(await response.json())
    } catch (error) {
      if (error instanceof RssProviderError) throw error
      throw new RssProviderError(controller.signal.aborted ? 'timeout' : 'network')
    } finally { clearTimeout(timer); options?.signal?.removeEventListener('abort', abort) }
  }
}
