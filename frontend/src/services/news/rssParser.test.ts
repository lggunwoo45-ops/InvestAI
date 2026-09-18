import { describe, expect, it } from 'vitest'

import { isSafeRssFeedConfig, parseRssDate, parseRssItems } from './rssParser'
import type { RssFeedConfig } from './rssFeedConfig'

const feed: RssFeedConfig = { id: 'test-feed', label: '  Test   Desk  ', market: 'crypto', category: 'crypto', url: null, enabled: false }

describe('RSS provider foundation', () => {
  it('normalizes safe RSS metadata without inventing symbol links or assessment', () => {
    const articles = parseRssItems(`<rss><channel><item><title>Bitcoin update</title><link>https://example.com/story</link><pubDate>Tue, 15 Sep 2026 10:00:00 GMT</pubDate><description>BTC market update</description></item></channel></rss>`, feed)
    expect(articles).toHaveLength(1)
    expect(articles[0]).toMatchObject({ title: 'Bitcoin update', source: 'Test Desk', publishedAt: '2026-09-15T10:00:00.000Z', url: 'https://example.com/story', category: 'crypto', relatedMarkets: ['crypto'], relatedSymbols: [], sentiment: 'unassessed', importance: 'unassessed', isMock: false })
  })

  it.each(['javascript:alert(1)', 'data:text/html,unsafe', 'file:///private', 'http://example.com/story'])('removes unsafe article link %s', (link) => {
    const articles = parseRssItems(`<rss><channel><item><title>Story</title><link>${link}</link><pubDate>Tue, 15 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>`, feed)
    expect(articles[0]?.url).toBeUndefined()
  })

  it('rejects invalid XML, DTDs, invalid dates, and oversized input', () => {
    expect(parseRssItems('<rss><item>', feed)).toEqual([])
    expect(parseRssItems('<!DOCTYPE rss [<!ENTITY x "bad">]><rss/>', feed)).toEqual([])
    expect(parseRssItems('<rss><item><title>Old</title><pubDate>not-a-date</pubDate></item></rss>', feed)).toEqual([])
    expect(parseRssItems('x'.repeat(1_000_001), feed)).toEqual([])
    expect(parseRssDate('invalid')).toBeNull()
  })

  it('allows only an explicitly enabled HTTPS feed URL', () => {
    expect(isSafeRssFeedConfig(feed)).toBe(false)
    expect(isSafeRssFeedConfig({ ...feed, enabled: true, url: 'http://example.com/feed' })).toBe(false)
    expect(isSafeRssFeedConfig({ ...feed, enabled: true, url: 'https://example.com/feed' })).toBe(true)
  })
})
