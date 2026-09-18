import type { NewsArticle } from '@/types/dashboard'
import type { NewsLoadOptions, NewsProvider } from './NewsProvider'
import { rssFeedConfig, type RssFeedConfig } from './rssFeedConfig'
import { isSafeRssFeedConfig, parseRssItems } from './rssParser'

export type RssFailureReason = 'not-configured' | 'network' | 'timeout' | 'http' | 'invalid-feed'

export class RssProviderError extends Error {
  constructor(readonly reason: RssFailureReason) {
    super(`RSS provider ${reason}`)
  }
}

const timeoutMs = 8_000
const maxFeedBytes = 1_000_000

async function readBoundedXml(response: Response): Promise<string> {
  const size = Number(response.headers.get('content-length'))
  if (Number.isFinite(size) && size > maxFeedBytes) throw new RssProviderError('invalid-feed')
  const contentType = response.headers.get('content-type')
  if (contentType && !/\b(?:xml|rss)\b/i.test(contentType)) throw new RssProviderError('invalid-feed')
  if (!response.body) {
    const xml = await response.text()
    if (new TextEncoder().encode(xml).byteLength > maxFeedBytes) throw new RssProviderError('invalid-feed')
    return xml
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let xml = ''
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > maxFeedBytes) {
      await reader.cancel()
      throw new RssProviderError('invalid-feed')
    }
    xml += decoder.decode(value, { stream: true })
  }
  return xml + decoder.decode()
}

/** Direct browser CORS request only. No proxy, credentials, scraping or CORS bypass. */
export class RssNewsProvider implements NewsProvider {
  readonly id = 'rss-experimental'
  readonly label = 'Federal Reserve Board'
  readonly type = 'rss' as const

  constructor(readonly feeds: readonly RssFeedConfig[] = rssFeedConfig) {}

  async loadNews(options?: NewsLoadOptions): Promise<readonly NewsArticle[]> {
    const enabled = this.feeds.filter(isSafeRssFeedConfig)
    if (!enabled.length) throw new RssProviderError('not-configured')
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    if (options?.signal?.aborted) controller.abort()
    options?.signal?.addEventListener('abort', onAbort, { once: true })
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
    try {
      const articles: NewsArticle[] = []
      for (const feed of enabled) {
        if (controller.signal.aborted) throw new RssProviderError(timedOut ? 'timeout' : 'network')
        const response = await fetch(feed.url!, {
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
        })
        if (!response.ok) throw new RssProviderError('http')
        const xml = await readBoundedXml(response)
        const parsed = parseRssItems(xml, feed)
        if (!parsed.length) throw new RssProviderError('invalid-feed')
        articles.push(...parsed)
      }
      return articles
    } catch (error) {
      if (error instanceof RssProviderError) throw error
      throw new RssProviderError(timedOut ? 'timeout' : 'network')
    } finally {
      clearTimeout(timer)
      options?.signal?.removeEventListener('abort', onAbort)
    }
  }
}
