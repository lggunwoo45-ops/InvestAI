import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createNewsProxyHandler, sourceAllowlist } from './proxy.mjs'

const rss = `<?xml version="1.0"?><rss><channel><item>
  <title>Official policy update</title>
  <link>https://www.federalreserve.gov/newsevents/pressreleases/example.htm</link>
  <guid>official-example</guid>
  <pubDate>Fri, 18 Sep 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<p>Policy announcement summary.</p>]]></description>
</item></channel></rss>`

async function invoke({ method = 'GET', url = '/api/news/rss?source=fed-press', fetchImpl }) {
  const headers = new Map()
  let body = ''
  const req = { method, url, headers: { origin: 'http://localhost:5173' } }
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value = '') { body += value },
  }
  await createNewsProxyHandler({ fetchImpl, now: () => new Date('2026-09-19T00:00:00.000Z') })(req, res)
  return { statusCode: res.statusCode, headers, payload: JSON.parse(body) }
}

describe('local news proxy', () => {
  it('normalizes the one allowlisted source without exposing raw XML', async () => {
    const calls = []
    const result = await invoke({ fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return new Response(rss, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } })
    } })

    assert.equal(result.statusCode, 200)
    assert.equal(result.payload.status, 'ok')
    assert.equal(result.payload.source, 'fed-press')
    assert.equal(result.payload.articles.length, 1)
    assert.deepEqual(result.payload.articles[0].relatedSymbols, [])
    assert.equal(result.payload.articles[0].isMock, false)
    assert.equal(JSON.stringify(result.payload).includes('<rss>'), false)
    assert.equal(calls[0].url, sourceAllowlist['fed-press'].url)
    assert.deepEqual(Object.keys(calls[0].options.headers), ['Accept'])
    assert.equal(result.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })

  it('rejects unsupported sources without fetching', async () => {
    let called = false
    const result = await invoke({ url: '/api/news/rss?source=unknown', fetchImpl: async () => { called = true } })
    assert.equal(result.statusCode, 400)
    assert.equal(result.payload.errors[0].code, 'UNSUPPORTED_SOURCE')
    assert.equal(called, false)
  })

  it('rejects non-GET requests', async () => {
    const result = await invoke({ method: 'POST', fetchImpl: async () => new Response(rss) })
    assert.equal(result.statusCode, 405)
    assert.equal(result.payload.errors[0].code, 'METHOD_NOT_ALLOWED')
  })

  it('rejects oversized upstream responses safely', async () => {
    const result = await invoke({ fetchImpl: async () => new Response('too large', { status: 200, headers: { 'Content-Length': '1000001', 'Content-Type': 'application/rss+xml' } }) })
    assert.equal(result.statusCode, 502)
    assert.equal(result.payload.status, 'unavailable')
    assert.equal(result.payload.errors[0].code, 'UPSTREAM_TOO_LARGE')
    assert.deepEqual(result.payload.articles, [])
  })

  it('returns unavailable JSON for upstream failure', async () => {
    const result = await invoke({ fetchImpl: async () => { throw new TypeError('offline') } })
    assert.equal(result.statusCode, 502)
    assert.equal(result.payload.errors[0].code, 'UPSTREAM_UNAVAILABLE')
    assert.equal(JSON.stringify(result.payload).includes('offline'), false)
  })

  it('rejects arbitrary URL parameters and never acts as an open proxy', async () => {
    let called = false
    const result = await invoke({ url: '/api/news/rss?source=fed-press&url=https://example.com/private', fetchImpl: async () => { called = true } })
    assert.equal(result.statusCode, 400)
    assert.equal(result.payload.errors[0].code, 'INVALID_QUERY')
    assert.equal(called, false)
  })
})
