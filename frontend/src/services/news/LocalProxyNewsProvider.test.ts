import { describe, expect, it, vi } from 'vitest'

import { LocalProxyNewsProvider, localNewsProxyEndpoint } from './LocalProxyNewsProvider'

const payload = {
  source: 'fed-press', sourceLabel: 'Federal Reserve Board', status: 'ok', fetchedAt: '2026-09-19T00:00:00.000Z',
  cacheStatus: 'none', fallbackUsed: false, errors: [], articles: [{
    id: 'rss-fed-press-example', title: 'Official policy update', summary: 'Policy announcement',
    url: 'https://www.federalreserve.gov/newsevents/pressreleases/example.htm', publishedAt: '2026-09-18T12:00:00.000Z',
    source: 'Federal Reserve Board', category: 'macro', relatedMarkets: ['macro'], relatedSymbols: [], sentiment: 'unassessed', importance: 'unassessed', isMock: false,
  }],
}

describe('LocalProxyNewsProvider', () => {
  it('loads and validates normalized localhost proxy articles', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const articles = await new LocalProxyNewsProvider(localNewsProxyEndpoint, fetchMock).loadNews()
    expect(fetchMock).toHaveBeenCalledWith(localNewsProxyEndpoint, expect.objectContaining({ method: 'GET', credentials: 'omit', cache: 'no-store' }))
    expect(articles).toHaveLength(1)
    expect(articles[0]).toMatchObject({ title: 'Official policy update', isMock: false, relatedSymbols: [] })
  })

  it('rejects malformed or mock proxy payloads', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...payload, articles: [{ ...payload.articles[0], isMock: true }] }), { status: 200 }))
    await expect(new LocalProxyNewsProvider(localNewsProxyEndpoint, fetchMock).loadNews()).rejects.toMatchObject({ reason: 'invalid-feed' })
  })

  it('reports an unavailable local server as a network failure', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))
    await expect(new LocalProxyNewsProvider(localNewsProxyEndpoint, fetchMock).loadNews()).rejects.toMatchObject({ reason: 'network' })
  })
})
