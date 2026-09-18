import type { NewsArticle } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import type { RssFeedConfig } from './rssFeedConfig'

const maxXmlLength = 1_000_000

export function parseRssDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export function normalizeNewsSource(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** Future verified entity mapping only. Guessing tickers from prose would create false links. */
export function extractRelatedSymbols(_article: Pick<NewsArticle, 'title' | 'summary'>, _catalog: readonly MarketInstrument[]): readonly string[] {
  return []
}

export function isSafeRssFeedConfig(config: RssFeedConfig): boolean {
  return Boolean(config.enabled && config.url && safeNewsUrl(config.url))
}

function itemText(item: Element, tag: string): string {
  return item.getElementsByTagName(tag).item(0)?.textContent?.trim() ?? ''
}

function stableId(value: string): string {
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(36)
}

/** Pure RSS 2.0 parser. It never fetches feeds, executes markup, or extracts speculative tickers. */
export function parseRssItems(xml: string, source: RssFeedConfig): readonly NewsArticle[] {
  if (!xml || xml.length > maxXmlLength || /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) return []
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) return []
  const sourceName = normalizeNewsSource(source.label)
  if (!sourceName) return []

  return [...document.getElementsByTagName('item')].flatMap((item) => {
    const title = itemText(item, 'title').slice(0, 300)
    const publishedAt = parseRssDate(itemText(item, 'pubDate'))
    if (!title || !publishedAt) return []
    const rawSummary = itemText(item, 'description')
    const summary = rawSummary.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
    const url = safeNewsUrl(itemText(item, 'link')) ?? undefined
    const identifier = itemText(item, 'guid') || url || `${title}|${publishedAt}`
    return [{
      id: `rss-${source.id}-${stableId(identifier)}`,
      title,
      source: sourceName,
      publishedAt,
      category: source.category,
      relatedSymbols: [],
      relatedMarkets: [source.market],
      sentiment: 'unassessed' as const,
      importance: 'unassessed' as const,
      summary,
      url,
      isMock: false,
    }]
  })
}
