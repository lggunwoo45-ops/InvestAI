import { describe, expect, it, vi } from 'vitest'

import type { NewsProvider } from './NewsProvider'
import { newsProvider } from './MockNewsProvider'
import { NewsService } from './newsService'

describe('NewsService provider boundary', () => {
  it('uses mock news by default without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await new NewsService().loadNews()
    expect(result.state).toBe('mock')
    expect(result.source).toBe('mock')
    expect(result.articles.length).toBeGreaterThan(0)
    expect(result.lastUpdatedAt).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('labels RSS unavailability and mock fallback explicitly', async () => {
    const result = await new NewsService().loadNews('rss-ready')
    expect(result).toMatchObject({ requestedMode: 'rss-ready', state: 'rss-unavailable', source: 'mock', error: 'rss-unavailable', fallback: true })
    expect(result.articles.every((article) => article.isMock)).toBe(true)
  })

  it('supports a future RSS provider without altering the UI contract', async () => {
    const rss: NewsProvider = { id: 'test-rss', label: 'Test RSS', type: 'rss', loadNews: async () => [{ ...(await newsProvider.loadNews())[0], isMock: false }] }
    const result = await new NewsService(newsProvider, rss).loadNews('rss-ready')
    expect(result).toMatchObject({ state: 'rss-ready', source: 'rss', providerLabel: 'Test RSS', fallback: false, error: null })
    expect(result.lastUpdatedAt).not.toBeNull()
  })

  it('exposes provider-not-configured when neither provider can load', async () => {
    const failed: NewsProvider = { id: 'failed', label: 'Failed', type: 'mock', loadNews: async () => { throw new Error('offline') } }
    expect(await new NewsService(failed).loadNews('rss-ready')).toMatchObject({ state: 'provider-not-configured', source: null, articles: [], fallback: false })
  })
})
