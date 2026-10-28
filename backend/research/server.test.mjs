import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createResearchClient, createResearchHandler } from './server.mjs'
import { Readable } from 'node:stream'
test('liquidation archive route validates scope and reports unavailable storage honestly', async () => {
  let calls = 0, failed = false
  const handler = createResearchHandler({ local: true, liquidations: { history(asset, hours) { calls++; if (failed) throw new Error('private path'); return { asset, hours } }, close() {} } })
  const path = '/api/research/liquidations/history?asset=BTC&hours=168'
  try {
    assert.deepEqual((await request(handler, path)).body, { asset: 'BTC', hours: 168 })
    for (const bad of [path + '&extra=1', path.replace('BTC', 'BAD'), path.replace('168', '100'), path + '&asset=ETH']) assert.equal((await request(handler, bad)).status, 400)
    assert.equal((await request(handler, path, { method: 'POST' })).status, 405)
    assert.equal((await request(handler, path, { origin: 'https://bad.example' })).status, 403)
    assert.equal(calls, 1); failed = true
    const failedResponse = await request(handler, path)
    assert.equal(failedResponse.status, 503); assert.equal(failedResponse.body.error, 'liquidation_history_unavailable')
  } finally { handler.close() }
})

test('fixed endpoints, shared cache and independent failures', async () => {
  let calls = 0, now = 10_000
  const client = createResearchClient({ now: () => now, fetchImpl: async (url, options) => {
    calls++; assert.equal(options.redirect, 'error')
    assert.ok(/^https:\/\/(fapi.binance.com|api.binance.com|api.upbit.com|api.alternative.me|api.coingecko.com|api.bybit.com|www.okx.com|api.bitget.com|api.hyperliquid.xyz)\//.test(url))
    if (url.includes('coingecko')) throw new Error('offline')
    return { ok: true, text: async () => JSON.stringify({ fixture: true }) }
  } })
  const [a, b] = await Promise.all([client.snapshot('BTC'), client.snapshot('BTC')])
  assert.equal(a.sources.global.status, 'unavailable'); assert.equal(b.sources.mark.status, 'available')
  assert.equal(calls, 19)
  await client.snapshot('BTC'); assert.equal(calls, 20) // Failed sources retry, good sources cached.
  now += 61_000; await client.snapshot('BTC'); assert.equal(calls, 38)
  await assert.rejects(() => client.snapshot('BTC&url=http://private'), /invalid_asset/)
})

test('preserves provider Date and cache Age separately from local receipt time', async () => {
  const client = createResearchClient({ now: () => 500_000, fetchImpl: async () => ({ ok: true, headers: { get: key => key === 'date' ? new Date(200_000).toUTCString() : key === 'age' ? '30' : null }, text: async () => JSON.stringify({ time: 199_000 }) }) })
  const result = await client.snapshot('BTC')
  assert.equal(result.sources.mark.receivedAt, 500_000)
  assert.equal(result.sources.mark.serverTime, 200_000)
  assert.equal(result.sources.mark.ageMs, 30_000)
})

function request(handler, url, { method = 'GET', origin, host = 'localhost:5173', ip = '127.0.0.1' } = {}) {
  return new Promise(resolve => {
    const req = { url, method, headers: { host, origin }, socket: { remoteAddress: ip } }
    const res = { destroyed: false, writableEnded: false, writeHead(status, headers) { this.status = status; this.headers = headers }, end(body) { resolve({ status: this.status, headers: this.headers, body: JSON.parse(body) }) } }
    handler(req, res)
  })
}
test('stored derivatives are read-only, validate scope, isolate quota and do not trigger collection', async () => {
  let calls = 0, closed = false
  const handler = createResearchHandler({ local: true, derivatives: { snapshot(asset, days) { calls++; return { asset, days } }, close() { closed = true } } })
  for (const path of ['?asset=BTC&days=365', '?asset=BTC&days=7&url=x', '?asset=BAD&days=7', '?asset=BTC&asset=ETH']) assert.equal((await request(handler, '/api/research/derivatives' + path)).status, 400)
  assert.equal((await request(handler, '/api/research/derivatives?asset=BTC&days=7', { method: 'POST' })).status, 405)
  assert.equal((await request(handler, '/api/research/derivatives?asset=BTC&days=7', { origin: 'https://bad.example' })).status, 403)
  assert.equal(calls, 0)
  assert.deepEqual((await request(handler, '/api/research/derivatives?asset=BTC&days=7')).body, { asset: 'BTC', days: 7 })
  for (let i = 1; i < 120; i++) await request(handler, '/api/research/derivatives?asset=BTC&days=7')
  assert.equal((await request(handler, '/api/research/derivatives?asset=BTC&days=7')).status, 429)
  handler.close(); assert.equal(closed, true)
})
test('settled funding route enforces read-only scope, time bounds, quotas and explicit failures', async () => {
  let calls = 0, error
  const handler = createResearchHandler({ local: true, now: () => 100_000_000, fundingReader: async (asset, from, to) => { calls++; if (error) throw new Error(error); return { asset, from, to } } })
  const path = '/api/research/funding-settlements?asset=BTC&from=3600000&to=7200000'
  assert.equal((await request(handler, path)).status, 200)
  for (const bad of [path + '&extra=1', path.replace('BTC', 'BAD'), path.replace('7200000', '360000000'), path.replace('from=3600000', 'from='), path.replace('from=3600000', 'from=3600000.5')]) assert.equal((await request(handler, bad)).status, 400)
  assert.equal((await request(handler, path, { origin: 'https://bad.example' })).status, 403)
  assert.equal((await request(handler, path, { method: 'POST' })).status, 405)
  assert.equal(calls, 1)
  for (const [reason, status] of [['funding_range_too_large', 422], ['funding_busy', 429], ['upstream_details', 503]]) {
    error = reason; const r = await request(handler, path); assert.equal(r.status, status); assert.notEqual(r.body.error, 'upstream_details')
  }
  handler.close()
})
test('context API validates bounded closed-time grids, origins and read-only scope', async () => {
  let calls = 0
  const handler = createResearchHandler({ local: true, now: () => 100_000_000, derivatives: { context(asset, timeframe, from, to) { calls++; return { asset, timeframe, from, to } }, close() {} } })
  const path = '/api/research/derivatives/context?asset=BTC&timeframe=1h&from=3600000&to=7200000'
  assert.equal((await request(handler, path)).status, 200)
  for (const bad of [path + '&extra=1', path.replace('BTC', 'BAD'), path.replace('7200000', '360000000'), path.replace('from=3600000', 'from=3600001'), path.replace('timeframe=1h', 'timeframe=toString')]) assert.equal((await request(handler, bad)).status, 400)
  assert.equal((await request(handler, path, { origin: 'https://bad.example' })).status, 403)
  assert.equal((await request(handler, path, { method: 'POST' })).status, 405)
  assert.equal(calls, 1); handler.close()
})
test('market events enforce origin/query/method boundaries, isolate polling quota and close resources', async () => {
  let liquidationCalls = 0, calendarCalls = 0, closed = 0
  const handler = createResearchHandler({ local: true, client: { snapshot: async asset => ({ asset }) }, liquidations: { snapshot(asset) { liquidationCalls++; return { asset } }, close() { closed++ } }, calendar: { async snapshot() { calendarCalls++; return { events: [] } }, close() { closed++ } } })
  for (const path of ['/api/research/liquidations?asset=BTC&asset=ETH', '/api/research/liquidations?asset=XXX', '/api/research/calendar?url=https://bad.example']) assert.equal((await request(handler, path)).status, 400)
  assert.equal((await request(handler, '/api/research/calendar', { origin: 'https://evil.example' })).status, 403)
  assert.equal((await request(handler, '/api/research/calendar', { method: 'POST' })).status, 405)
  for (let i = 0; i < 40; i++) assert.equal((await request(handler, '/api/research/liquidations?asset=BTC')).status, 200)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC')).status, 200)
  assert.equal((await request(handler, '/api/research/calendar')).status, 200)
  assert.equal(liquidationCalls, 40); assert.equal(calendarCalls, 1)
  handler.close(); assert.equal(closed, 2)
})
test('local origin, asset and query validation prevent arbitrary requests', async () => {
  let calls = 0
  const handler = createResearchHandler({ local: true, client: { snapshot: async asset => { calls++; return { asset } } } })
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC', { origin: 'https://evil.example' })).status, 403)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC', { host: 'evil.example:5173' })).status, 403)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC', { method: 'POST' })).status, 405)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC&url=x')).status, 400)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC&asset=ETH')).status, 400)
  assert.equal((await request(handler, '/api/research/snapshot?asset=UNKNOWN')).status, 400)
  assert.equal(calls, 0)
  assert.equal((await request(handler, '/api/research/snapshot?asset=BTC', { origin: 'http://localhost:5173' })).status, 200)
  assert.equal(calls, 1)
})
test('caps public request volume without hitting providers again', async () => {
  const handler = createResearchHandler({ client: { snapshot: async () => ({}) } })
  for (let i = 0; i < 30; i++) assert.equal((await request(handler, '/api/research/snapshot?asset=BTC')).status, 200)
  const limited = await request(handler, '/api/research/snapshot?asset=BTC')
  assert.equal(limited.status, 429); assert.equal(limited.headers['Retry-After'], '60')
})

test('exposes the response clock to the allowed website without changing cached data timestamps', async () => {
  const origin = 'https://lggunwoo45-ops.github.io'
  const body = { fetchedAt: 100_000 }
  const handler = createResearchHandler({ origins: [origin], now: () => 130_000, historyReader: async () => body })
  const result = await request(handler, '/api/research/history?asset=BTC&timeframe=1h&count=1000', { origin })
  assert.equal(result.status, 200)
  assert.equal(result.headers['Access-Control-Allow-Origin'], origin)
  assert.equal(result.headers['Access-Control-Expose-Headers'], 'Date')
  assert.equal(Date.parse(result.headers.Date), 130_000)
  assert.deepEqual(result.body, body)
})

test('wallet calls public information only and excludes other account fields', async () => {
  let calls = 0
  const client = createResearchClient({ fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.hyperliquid.xyz/info')
    assert.deepEqual(JSON.parse(options.body), { type: 'clearinghouseState', user: `0x${'0'.repeat(40)}` })
    return { ok: true, json: async () => ({ marginSummary: { ignored: true }, assetPositions: [{ position: { coin: 'BTC', szi: '1', entryPx: '100', liquidationPx: '90', unrealizedPnl: '2', positionValue: '102', leverage: { value: 2, type: 'isolated' }, ignored: 'private' } }] }) }
  } })
  const response = await client.wallet(`0x${'0'.repeat(40)}`)
  assert.equal(response.positions[0].liquidationPrice, '90')
  assert.equal(response.positions[0].ignored, undefined); assert.equal(response.marginSummary, undefined)
  await client.wallet(`0x${'0'.repeat(40)}`); assert.equal(calls, 2)
  await assert.rejects(() => client.wallet('https://evil.example'), /invalid_address/)
})

test('wallet body is bounded and rejects keys and malformed addresses', async () => {
  let calls = 0
  const handler = createResearchHandler({ client: { wallet: async () => { calls++; return { positions: [] } } } })
  const post = body => new Promise(resolve => {
    const req = Readable.from([body]); Object.assign(req, { url: '/api/research/wallet', method: 'POST', headers: { host: 'localhost:5173', 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' } })
    const res = { writeHead(status) { this.status = status }, end(data) { resolve({ status: this.status, body: JSON.parse(data) }) } }
    handler(req, res)
  })
  assert.equal((await post('{')).status, 400)
  assert.equal((await post(JSON.stringify({ address: 'bad' }))).status, 400)
  assert.equal((await post(JSON.stringify({ address: `0x${'0'.repeat(40)}`, key: 'not allowed' }))).status, 400)
  assert.equal((await post('x'.repeat(513))).status, 413)
  assert.equal(calls, 0)
  assert.equal((await post(JSON.stringify({ address: `0x${'0'.repeat(40)}` }))).status, 200)
  assert.equal(calls, 1)
})
