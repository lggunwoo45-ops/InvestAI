import { describe, expect, it, vi } from 'vitest'

import type { NewsProvider } from './NewsProvider'
import { newsProvider } from './MockNewsProvider'
import { NewsService } from './newsService'
import { RssProviderError } from './RssNewsProvider'

const unavailableRss: NewsProvider = {
  id: 'unavailable-rss',
  label: 'Unavailable RSS',
  type: 'rss',
  loadNews: async () => { throw new RssProviderError('not-configured') },
}

describe('NewsService provider boundary', () => {
  it('uses mock news by default without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await new NewsService(newsProvider, unavailableRss).loadNews()
    expect(result.state).toBe('mock')
    expect(result.source).toBe('mock')
    expect(result.articles.length).toBeGreaterThan(0)
    expect(result.lastUpdatedAt).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('labels RSS unavailability and mock fallback explicitly', async () => {
    const failingRss: NewsProvider = { ...unavailableRss, loadNews: async () => { throw new RssProviderError('network') } }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await new NewsService(newsProvider, failingRss).loadNews('rss-ready')
    expect(result).toMatchObject({ requestedMode: 'rss-ready', state: 'rss-unavailable', source: 'mock', error: 'network', fallback: true })
    expect(result.articles.every((article) => article.isMock)).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('supports a future RSS provider without altering the UI contract', async () => {
    const rss: NewsProvider = { id: 'test-rss', label: 'Test RSS', type: 'rss', loadNews: async () => [{ ...(await newsProvider.loadNews())[0], isMock: false }] }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await new NewsService(newsProvider, rss).loadNews('rss-ready')
    expect(result).toMatchObject({ state: 'rss-ready', source: 'rss', providerLabel: 'Test RSS', fallback: false, error: null })
    expect(result.lastUpdatedAt).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('exposes provider-not-configured when neither provider can load', async () => {
    const failed: NewsProvider = { id: 'failed', label: 'Failed', type: 'mock', loadNews: async () => { throw new Error('offline') } }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect(await new NewsService(failed, unavailableRss).loadNews('rss-ready')).toMatchObject({ state: 'provider-not-configured', source: null, articles: [], fallback: false })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
