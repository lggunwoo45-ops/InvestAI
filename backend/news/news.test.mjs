import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createNewsHandler, createNewsService, parseHeadlines, sources } from './news.mjs'

const at = Date.parse('2026-10-20T12:00:00Z')
const item = (source = sources[0], extra = {}) => `<item><title>${extra.title ?? 'Bitcoin &amp; Ethereum news'}</title><link>${extra.url ?? `https://${source.host}/story`}</link><pubDate>${extra.date ?? new Date(at - 1000).toUTCString()}</pubDate><description>Must never be republished</description></item>`
const xmlResponse = xml => new Response(`<rss><channel>${xml}</channel></rss>`, { headers: { 'content-type': 'application/rss+xml' } })

test('parses attributed headlines, exact asset hints and deduplicates original URLs', () => {
  const rows = parseHeadlines(item() + item(sources[0], { url: 'https://coindesk.com/story?utm_source=test#read' }), sources[0], at)
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].relatedSymbols, ['BTC', 'ETH'])
  assert.equal(rows[0].title, 'Bitcoin & Ethereum news')
  assert.equal(rows[0].url, 'https://coindesk.com/story')
  assert.equal(rows[0].summary, '')
  assert.equal(rows[0].isMock, false)
  assert.equal(rows[0].sentiment, 'unassessed')
  assert.deepEqual(parseHeadlines(item(sources[1]), sources[1], at)[0].relatedSymbols, [])
  assert.deepEqual(parseHeadlines(item(sources[0], { title: 'Bitcoin cash futures launch' }), sources[0], at)[0].relatedSymbols, [])
})

test('rejects external links, credentials, future dates, XML entities and oversized feeds', () => {
  for (const url of ['javascript:alert(1)', 'http://coindesk.com/story', 'https://coindesk.com.evil.test/story', 'https://user:pass@coindesk.com/story', 'https://coindesk.com:4430/story']) {
    assert.deepEqual(parseHeadlines(item(sources[0], { url }), sources[0], at), [])
  }
  assert.deepEqual(parseHeadlines(item(sources[0], { date: new Date(at + 600000).toUTCString() }), sources[0], at), [])
  assert.deepEqual(parseHeadlines('<!DOCTYPE rss>' + item(), sources[0], at), [])
  assert.deepEqual(parseHeadlines(' '.repeat(1500001) + item(), sources[0], at), [])
})

test('shares concurrent source requests and caches each source for five minutes', async () => {
  let time = at, calls = 0
  const service = createNewsService({ now: () => time, fetchImpl: async url => {
    calls++
    await new Promise(resolve => setImmediate(resolve))
    return xmlResponse(item(sources.find(source => source.url === url)))
  } })
  const responses = await Promise.all([service(), service(), service()])
  assert.equal(calls, 2)
  assert.ok(responses.every(feed => feed.status === 'ready' && feed.articles.length === 2))
  time += 299999
  assert.equal((await service()).sources[0].fetchedAt, new Date(at).toISOString())
  assert.equal(calls, 2)
  time++
  await service()
  assert.equal(calls, 4)
})

test('keeps original receipt time during source outages, retries after 30s and expires old cache', async () => {
  let time = at, failing = false, calls = 0
  const service = createNewsService({ now: () => time, fetchImpl: async url => {
    calls++
    if (failing) throw new Error('offline')
    return xmlResponse(item(sources.find(source => source.url === url)))
  } })
  await service()
  time += 300000; failing = true
  const delayed = await service()
  assert.equal(delayed.status, 'partial')
  assert.equal(delayed.sources[0].state, 'stale')
  assert.equal(delayed.sources[0].fetchedAt, new Date(at).toISOString())
  await service()
  assert.equal(calls, 4)
  time += 30000; await service()
  assert.equal(calls, 6)
  time = at + 1800001
  const expired = await service()
  assert.equal(expired.status, 'unavailable')
  assert.deepEqual(expired.articles, [])
  assert.equal(expired.fallbackUsed, false)
})

test('one failed feed does not hide the other; unsafe response is not parsed', async () => {
  const service = createNewsService({ now: () => at, fetchImpl: async url => url === sources[0].url
    ? new Response('not xml', { headers: { 'content-type': 'text/html' } }) : xmlResponse(item(sources[1])) })
  const feed = await service()
  assert.equal(feed.status, 'partial')
  assert.equal(feed.articles.length, 1)
  assert.equal(feed.sources[0].state, 'unavailable')
  assert.equal(feed.sources[1].state, 'ready')
})

test('route enforces origin, method, exact paths and rate limit without upstream URL parameters', async t => {
  let calls = 0, time = at
  const handler = createNewsHandler({ origins: ['https://example.test'], now: () => time,
    service: async () => { calls++; return { status: 'ready', articles: [] } } })
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, options = {}) => fetch(base + path, options)
  const good = await request('/api/news/headlines', { headers: { Origin: 'https://example.test' } })
  assert.equal(good.status, 200)
  assert.equal(good.headers.get('access-control-allow-origin'), 'https://example.test')
  assert.equal((await request('/api/news/headlines', { headers: { Origin: 'https://evil.test' } })).status, 403)
  assert.equal((await request('/api/news/headlines', { method: 'POST' })).status, 405)
  assert.equal((await request('/api/news/headlines?url=http://localhost/secret')).status, 404)
  assert.equal(calls, 1)
  for (let index = 1; index < 60; index++) assert.equal((await request('/api/news/headlines')).status, 200)
  assert.equal((await request('/api/news/headlines')).status, 429)
  time += 60000
  assert.equal((await request('/api/news/headlines')).status, 200)
})
