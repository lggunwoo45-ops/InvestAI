import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { clientAddress, createUsageGuard, createUpstreamBudget } from './usage.mjs'
import { createRest } from './rest.mjs'
import { createMarketHandler } from './server.mjs'
import { createNewsHandler } from '../news/news.mjs'

const req = (ip = '192.0.2.1', headers = {}) => ({ socket: { remoteAddress: ip }, headers })
const candle = '/api/upbit/candles/days?market=KRW-BTC&count=120'
const other = candle.replace('BTC', 'ETH')
const result = () => new Response('[]')
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  assert.fail('condition timed out')
}

test('default identity ignores spoofed headers; explicit Railway mode accepts only a single valid real IP', () => {
  assert.equal(clientAddress(req('192.0.2.1', { 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '198.51.100.3' })), '192.0.2.1')
  assert.equal(clientAddress(req('192.0.2.1', { 'x-real-ip': '198.51.100.2' }), true), '198.51.100.2')
  for (const value of ['198.51.100.2, 198.51.100.3', ['198.51.100.2'], 'fe80::1%eth0', 'invalid', undefined]) {
    assert.equal(clientAddress(req('192.0.2.1', { 'x-real-ip': value, 'x-forwarded-for': '198.51.100.4' }), true), '192.0.2.1')
  }
  assert.equal(clientAddress(req('::ffff:192.0.2.1')), '192.0.2.1')
  assert.equal(clientAddress(req('2001:0DB8:0:0:0:0:0:1')), clientAddress(req('2001:db8::1')))
})

test('requests from one edge peer get independent quotas only in explicit proxy mode; cooldown expires exactly', () => {
  let time = 0
  const usage = createUsageGuard({ now: () => time, trustRailwayProxy: true, requestLimit: 2 })
  const a = req('10.0.0.1', { 'x-real-ip': '192.0.2.1' }), b = req('10.0.0.1', { 'x-real-ip': '192.0.2.2' })
  usage(a); usage(a); time = 59_001
  assert.throws(() => usage(a), { status: 429, retryAfter: 1 })
  usage(b)
  time = 60_000; assert.doesNotThrow(() => usage(a))
})

test('REST concurrency is bounded per address and globally; release is idempotent', () => {
  const usage = createUsageGuard({ maxRest: 2, maxRestPerClient: 1 })
  const a = req(), b = req('192.0.2.2'), c = req('192.0.2.3')
  const stopA = usage(a)('rest')
  assert.throws(() => usage(a)('rest'), { message: 'rest_capacity' })
  const stopB = usage(b)('rest')
  assert.throws(() => usage(c)('rest'), { message: 'rest_capacity' })
  stopA(); stopA()
  const stopC = usage(c)('rest')
  assert.throws(() => usage(a)('rest'), { message: 'rest_capacity' })
  stopB(); stopC(); usage(a)('rest')()
})

test('active streams retain their quota across window cleanup; identity memory stays bounded', () => {
  let time = 0
  const usage = createUsageGuard({ now: () => time, maxClients: 1, maxStreamsPerClient: 1 })
  const stop = usage(req())('stream'); time = 60_000
  assert.throws(() => usage(req())('stream'), { message: 'stream_capacity' })
  assert.throws(() => usage(req('192.0.2.2')), { message: 'busy' })
  stop(); time = 120_000
  assert.doesNotThrow(() => usage(req('192.0.2.2'))('stream')())
})

test('upstream ceiling counts starts, while shared pending work and fresh cache cost one request', async () => {
  let calls = 0, time = 0
  const rest = createRest({ interval: 0, consumeBudget: createUpstreamBudget({ limit: 1, now: () => time }),
    fetchImpl: async () => { calls++; await new Promise(resolve => setImmediate(resolve)); return result() } })
  const [a, b] = await Promise.all([rest(candle), rest(candle)])
  assert.equal(a.receivedAt, b.receivedAt)
  assert.equal((await rest(candle)).cache, 'HIT')
  await assert.rejects(rest(other), { message: 'upstream_budget', retryAfter: 3600 })
  assert.equal(calls, 1)
  time = 3_600_000; await rest(other); assert.equal(calls, 2)
})

test('failed upstream attempts count too, and zero pauses new REST calls without invalid values disabling protection', async () => {
  let calls = 0
  const rest = createRest({ interval: 0, consumeBudget: createUpstreamBudget({ limit: 1 }), fetchImpl: async () => { calls++; throw new Error('offline') } })
  await assert.rejects(rest(candle), /offline/)
  await assert.rejects(rest(candle), { message: 'upstream_budget' })
  assert.equal(calls, 1)
  assert.throws(createUpstreamBudget({ limit: 0 }), { message: 'upstream_budget' })
  for (const limit of [-1, NaN, Infinity, 1.5, 100_001]) assert.throws(() => createUpstreamBudget({ limit }))
})

async function listen(t, handler) {
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { handler.close?.(); server.closeAllConnections(); server.close() })
  return `http://127.0.0.1:${server.address().port}`
}

test('HTTP protection blocks before upstream work, exposes Retry-After and leaves health available', async t => {
  let calls = 0
  const handler = createMarketHandler({ origins: ['https://example.test'], usage: createUsageGuard({ requestLimit: 1 }),
    rest: async () => { calls++; throw new Error('offline') } })
  const base = await listen(t, handler)
  assert.equal((await fetch(base + candle)).status, 503)
  const denied = await fetch(base + other, { headers: { Origin: 'https://example.test' } })
  assert.equal(denied.status, 429)
  assert.equal(denied.headers.get('retry-after'), '60')
  assert.match(denied.headers.get('access-control-expose-headers'), /Retry-After/)
  assert.equal((await fetch(base + '/api/upbit/health')).status, 200)
  assert.equal(calls, 1)
  const stream = await fetch(base + '/api/upbit/stream?market=KRW-BTC')
  assert.equal(stream.headers.get('content-type'), 'text/event-stream')
  assert.match(await stream.text(), /event: cooldown\ndata: \{"retryAfter":60\}/)
})

test('aborted REST consumers release capacity; subscription failures release stream slots', async t => {
  let calls = 0
  const handler = createMarketHandler({ usage: createUsageGuard({ maxRestPerClient: 1, maxStreamsPerClient: 1 }),
    rest: (_path, signal) => { calls++; return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) },
    streams: { subscribe() { throw new Error('unavailable') }, close() {} } })
  const base = await listen(t, handler), abort = new AbortController()
  const pending = fetch(base + candle, { signal: abort.signal }).catch(() => {})
  await until(() => calls === 1)
  assert.equal((await fetch(base + other)).status, 503)
  abort.abort(); await pending
  // A health request allows the close/abort callbacks to finish before retry.
  await fetch(base + '/api/upbit/health')
  const again = new AbortController(), next = fetch(base + other, { signal: again.signal }).catch(() => {})
  await until(() => calls === 2)
  again.abort(); await next
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + '/api/upbit/stream?market=KRW-BTC')
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'upstream_unavailable' })
  }
})

test('news shares the proxy identity policy and protects health from quota exhaustion', async t => {
  let calls = 0
  const base = await listen(t, createNewsHandler({ usage: createUsageGuard({ trustRailwayProxy: true, requestLimit: 1 }),
    service: async () => { calls++; return { status: 'ready', articles: [] } } }))
  const get = ip => fetch(base + '/api/news/headlines', { headers: { 'x-real-ip': ip } })
  assert.equal((await get('192.0.2.1')).status, 200)
  assert.equal((await get('192.0.2.1')).status, 429)
  assert.equal((await get('192.0.2.2')).status, 200)
  assert.equal((await fetch(base + '/api/news/health')).status, 200)
  assert.equal(calls, 2)
})

test('ten independent viewers can load three analysis frames, sharing just three upstream requests', async t => {
  let calls = 0
  const handler = createMarketHandler({ trustRailwayProxy: true, rest: createRest({ interval: 0,
    fetchImpl: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 20)); return result() } }) })
  const base = await listen(t, handler)
  const responses = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    ['days', 'minutes/60', 'minutes/240'].map(frame => fetch(`${base}/api/upbit/candles/${frame}?market=KRW-BTC&count=120`,
      { headers: { 'x-real-ip': `192.0.2.${i + 1}` } }))).flat())
  assert.ok(responses.every(response => response.status === 200))
  await Promise.all(responses.map(response => response.json()))
  assert.equal(calls, 3)
})
