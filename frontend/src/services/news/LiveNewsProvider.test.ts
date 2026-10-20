import { describe, expect, it, vi } from 'vitest'
import { LiveNewsProvider, liveNewsEndpoint, parseLiveFeed } from './LiveNewsProvider'
import { NewsService } from './newsService'

const at = '2026-10-20T12:00:00.000Z'
function payload() {
  return { version: 1, source: 'public-rss', fallbackUsed: false, status: 'partial', checkedAt: at,
    sources: [
      { id: 'coindesk', label: 'CoinDesk', state: 'ready', fetchedAt: at, count: 1 },
      { id: 'fed-press', label: 'Federal Reserve Board', state: 'unavailable', fetchedAt: null, count: 0 },
    ],
    articles: [{ id: 'real-btc', title: 'Bitcoin news', summary: '', source: 'CoinDesk', publishedAt: at, category: 'crypto',
      relatedMarkets: ['crypto'], relatedSymbols: ['BTC'], sentiment: 'unassessed', importance: 'unassessed', isMock: false, url: 'https://www.coindesk.com/story' }],
  }
}

describe('live news contract', () => {
  it('accepts attributed real headlines without inventing summaries or sentiment', () => {
    expect(parseLiveFeed(payload()).articles[0]).toMatchObject({ summary: '', sentiment: 'unassessed', isMock: false })
    expect(liveNewsEndpoint('https://news.example.test')).toBe('https://news.example.test/api/news/headlines')
    for (const base of ['', 'http://external.test', 'https://user:secret@news.test', 'https://news.test/api', 'https://news.test?url=secret']) expect(liveNewsEndpoint(base)).toBeNull()
  })
  it('rejects forged provenance, contradictory status, duplicate articles and invalid timestamps', () => {
    const wrong = [
      { ...payload(), fallbackUsed: true }, { ...payload(), status: 'ready' },
      { ...payload(), sources: [{ ...payload().sources[0], id: '__proto__' }, payload().sources[1]] },
      { ...payload(), articles: [payload().articles[0], payload().articles[0]] },
      { ...payload(), articles: [{ ...payload().articles[0], url: 'https://coindesk.com.evil.test/' }] },
      { ...payload(), articles: [{ ...payload().articles[0], summary: 'Invented narrative' }] },
      { ...payload(), sources: [{ ...payload().sources[0], fetchedAt: '2026-10-20T11:00:00Z' }, payload().sources[1]] },
    ]
    for (const value of wrong) expect(() => parseLiveFeed(value)).toThrow()
  })
  it('keeps a stale source timestamp and never calls the mock provider on a live failure', async () => {
    const data = payload()
    data.sources[0].state = 'stale'
    data.sources[0].fetchedAt = '2026-10-20T11:55:00.000Z'
    const live = new LiveNewsProvider('https://news.test/api/news/headlines', vi.fn(async () => new Response(JSON.stringify(data))))
    const result = await new NewsService(undefined, undefined, undefined, live).loadNews('live')
    expect(result).toMatchObject({ fallback: false, lastUpdatedAt: '2026-10-20T11:55:00.000Z', source: 'rss' })
    const failed = new LiveNewsProvider(null)
    const unavailable = await new NewsService(undefined, undefined, undefined, failed).loadNews('live')
    expect(unavailable).toMatchObject({ articles: [], fallback: false, source: null, error: 'not-configured' })
  })
  it('accepts an explicit all-unavailable 503 response and cancels requests', async () => {
    const data = { ...payload(), status: 'unavailable', articles: [], sources: payload().sources.map(source => ({ ...source, state: 'unavailable', fetchedAt: null, count: 0 })) }
    const provider = new LiveNewsProvider('https://news.test/api/news/headlines', vi.fn(async () => new Response(JSON.stringify(data), { status: 503 })))
    expect((await provider.load()).articles).toEqual([])
    const abort = new AbortController()
    const pending = new LiveNewsProvider('https://news.test/api/news/headlines', vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))))
    const task = pending.load({ signal: abort.signal })
    abort.abort()
    await expect(task).rejects.toThrow()
  })
})
