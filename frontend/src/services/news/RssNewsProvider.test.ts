import { describe, expect, it, vi } from 'vitest'

import { RssNewsProvider, RssProviderError } from './RssNewsProvider'
import type { RssFeedConfig } from './rssFeedConfig'

const config: RssFeedConfig = { id: 'official-test', label: 'Official Test', market: 'macro', category: 'macro', url: 'https://example.com/feed.xml', enabled: true }
const xml = '<rss><channel><item><title>Rate update</title><link>https://example.com/story</link><pubDate>Tue, 15 Sep 2026 10:00:00 GMT</pubDate><description>Policy news</description></item></channel></rss>'

describe('RssNewsProvider experimental fetch', () => {
  it('makes an opt-in credential-free CORS request and maps valid items', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(xml, { status: 200, headers: { 'Content-Type': 'text/xml' } }))
    const articles = await new RssNewsProvider([config]).loadNews()
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(fetchSpy.mock.calls[0][0]).toBe(config.url)
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store' })
    expect(articles[0]).toMatchObject({ source: 'Official Test', category: 'macro', url: 'https://example.com/story', isMock: false, sentiment: 'unassessed', importance: 'unassessed', relatedSymbols: [] })
    fetchSpy.mockRestore()
  })

  it('never fetches a disabled or non-HTTPS feed', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(new RssNewsProvider([{ ...config, url: 'http://example.com/feed.xml' }]).loadNews()).rejects.toMatchObject({ reason: 'not-configured' })
    await expect(new RssNewsProvider([{ ...config, enabled: false }]).loadNews()).rejects.toMatchObject({ reason: 'not-configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it.each([
    [new Response('not XML', { status: 200 }), 'invalid-feed'],
    [new Response('offline', { status: 503 }), 'http'],
    [new Response(xml, { status: 200, headers: { 'Content-Type': 'text/html' } }), 'invalid-feed'],
    [new Response(xml, { status: 200, headers: { 'Content-Length': '1000001' } }), 'invalid-feed'],
  ])('rejects invalid or unsuccessful responses without partial news', async (response, reason) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response)
    await expect(new RssNewsProvider([config]).loadNews()).rejects.toMatchObject({ reason })
    fetchSpy.mockRestore()
  })

  it('classifies a browser network or CORS rejection without leaking the exception', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(new RssNewsProvider([config]).loadNews()).rejects.toEqual(new RssProviderError('network'))
    fetchSpy.mockRestore()
  })

  it('passes an AbortSignal to fetch and ends cancelled requests', async () => {
    const parent = new AbortController()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const pending = new RssNewsProvider([config]).loadNews({ signal: parent.signal })
    parent.abort()
    await expect(pending).rejects.toMatchObject({ reason: 'network' })
    fetchSpy.mockRestore()
  })

  it('times out a hanging request', async () => {
    vi.useFakeTimers()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    try {
      const pending = new RssNewsProvider([config]).loadNews()
      const assertion = expect(pending).rejects.toMatchObject({ reason: 'timeout' })
      await vi.advanceTimersByTimeAsync(8_001)
      await assertion
    } finally {
      fetchSpy.mockRestore()
      vi.useRealTimers()
    }
  })
})
