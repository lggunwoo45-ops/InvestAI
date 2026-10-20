import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { setTimeout as wait } from 'node:timers/promises'
import { Gate } from './gate.mjs'
import { createRest, parseRequest } from './rest.mjs'
import { createStreams } from './stream.mjs'
import { createMarketHandler } from './server.mjs'

const candle = '/api/upbit/candles/minutes/60?market=KRW-BTC&count=120'
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
async function until(check) { for (let i = 0; i < 100; i++) { if (check()) return; await wait(5) } assert.fail('condition timed out') }

test('only fixed public catalog/candle routes and bounded parameters are allowed', () => {
  assert.equal(parseRequest(candle).group, 'candle')
  assert.equal(parseRequest('/api/upbit/ticker/all?quote_currencies=USDT,KRW,BTC').path, '/ticker/all?quote_currencies=BTC,KRW,USDT')
  for (const path of ['/api/upbit/orders', '/api/upbit/candles/minutes/60?market=KRW-BTC&count=201', '/api/upbit/candles/minutes/60?market=../../secret&count=1', candle + '&url=http://localhost', '/api/upbit/ticker/all?quote_currencies=EUR']) assert.throws(() => parseRequest(path))
})

test('server gate paces requests and cancels queued consumers without an upstream call', async () => {
  const gate = new Gate(40), starts = []
  await gate.run(() => starts.push(Date.now()))
  const controller = new AbortController()
  const canceled = gate.run(() => assert.fail('canceled work ran'), controller.signal)
  const outcome = assert.rejects(canceled, { name: 'AbortError' }); controller.abort(); await outcome
  await gate.run(() => starts.push(Date.now()))
  assert.ok(starts[1] - starts[0] >= 35)
})

test('REST calls omit browser credentials/origin, coalesce consumers, and preserve cache age', async () => {
  let complete, count = 0
  const rest = createRest({ interval: 0, fetchImpl: async (url, options) => {
    count++; assert.equal(url, 'https://api.upbit.com/v1/candles/minutes/60?market=KRW-BTC&count=120')
    assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.redirect, 'error')
    return new Promise(resolve => { complete = resolve })
  } })
  const controller = new AbortController()
  const a = rest(candle, controller.signal), b = rest(candle)
  await until(() => complete)
  const canceled = assert.rejects(a, { name: 'AbortError' }); controller.abort(); await canceled
  complete(json([{ candle: 1 }]))
  const fresh = await b, cached = await rest(candle)
  assert.equal(count, 1); assert.equal(fresh.cache, 'MISS'); assert.equal(cached.cache, 'HIT')
  assert.equal(fresh.receivedAt, cached.receivedAt); assert.deepEqual(cached.data, [{ candle: 1 }])
})

test('last REST consumer cancels upstream and abandoned response cannot populate cache', async () => {
  let signal, count = 0
  const rest = createRest({ interval: 0, fetchImpl: async (_url, options) => {
    count++; if (count > 1) return json([{ fresh: true }])
    signal = options.signal
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  } })
  const controller = new AbortController(), pending = rest(candle, controller.signal)
  await until(() => signal)
  const outcome = assert.rejects(pending, { name: 'AbortError' }); controller.abort(); await outcome
  assert.equal(signal.aborted, true)
  assert.deepEqual((await rest(candle)).data, [{ fresh: true }]); assert.equal(count, 2)
})

test('expired history is refreshed and failures are not cached as successful data', async () => {
  let count = 0
  const rest = createRest({ interval: 0, ttl: 10, fetchImpl: async () => ++count === 2 ? new Response('[]', { status: 500 }) : json([{ sequence: count }]) })
  await rest(candle); await wait(15)
  await assert.rejects(rest(candle), { status: 502 })
  assert.equal((await rest(candle)).data[0].sequence, 3)
})

test('429 and 418 honor cooldown and block further calls, including other quota groups', async () => {
  for (const status of [429, 418]) {
    let count = 0
    const rest = createRest({ interval: 0, fetchImpl: async () => { count++; return new Response('[]', { status, headers: { 'Retry-After': '3' } }) } })
    await assert.rejects(rest(candle), error => error.status === 503 && error.retryAfter >= 3)
    await assert.rejects(rest('/api/upbit/ticker/all?quote_currencies=KRW'), { message: 'upstream_cooldown' })
    assert.equal(count, 1)
  }
})

test('malformed and oversized upstream responses are rejected', async () => {
  for (const body of ['{}', 'bad json', ' '.repeat(2_000_001)]) {
    const rest = createRest({ interval: 0, fetchImpl: async () => new Response(body) })
    await assert.rejects(rest(candle))
  }
})

class Socket extends EventTarget {
  static instances = []
  sent = []; closed = false
  constructor(url) { super(); assert.equal(url, 'wss://api.upbit.com/websocket/v1'); Socket.instances.push(this) }
  send(message) { this.sent.push(JSON.parse(message)) }
  close() { this.closed = true; this.dispatchEvent(new Event('close')) }
  emit(type, value) { this.dispatchEvent(type === 'message' ? new MessageEvent(type, { data: JSON.stringify(value) }) : new Event(type)) }
}

test('stream subscribers share one upstream and retain original receipt times without replaying trades', async t => {
  Socket.instances = []
  const broker = createStreams({ Socket, interval: 0 }); t.after(() => broker.close())
  const events = [], stopA = broker.subscribe('KRW-BTC', { status() {}, data: (...args) => events.push(args) })
  await until(() => Socket.instances.length === 1)
  const socket = Socket.instances[0]; socket.emit('open')
  assert.equal(socket.sent.length, 1)
  socket.emit('message', { code: 'KRW-BTC', type: 'ticker', trade_price: 100 })
  socket.emit('message', { code: 'KRW-BTC', type: 'trade', trade_price: 101 })
  await until(() => events.length === 2)
  const later = [], stopB = broker.subscribe('KRW-BTC', { status() {}, data: (...args) => later.push(args) })
  assert.equal(Socket.instances.length, 1); assert.equal(later.length, 1)
  assert.equal(later[0][1], events[0][1]); assert.equal(later[0][0].type, 'ticker')
  stopA(); assert.equal(socket.closed, false)
  stopB(); assert.equal(socket.closed, true)
})

test('upstream disconnect invalidates replay state, reports recovery and stops abandoned reconnects', async t => {
  Socket.instances = []
  const broker = createStreams({ Socket, interval: 0, maximum: 1 }); t.after(() => broker.close())
  const statuses = []
  const stop = broker.subscribe('KRW-BTC', { status: status => statuses.push(status), data() {} })
  await until(() => Socket.instances.length === 1)
  assert.throws(() => broker.subscribe('KRW-ETH', {}), { status: 503 })
  Socket.instances[0].emit('open'); Socket.instances[0].emit('close')
  assert.equal(statuses.at(-1), 'reconnecting')
  stop(); await wait(20); assert.equal(Socket.instances.length, 1)
})

test('HTTP boundary rejects writes, arbitrary routes and unapproved origins; emits timing and freshness', async t => {
  let calls = 0
  const handler = createMarketHandler({ origins: ['https://investai.example'], rest: createRest({ interval: 0, fetchImpl: async () => { calls++; return json([{ ok: true }]) } }) })
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { handler.close(); server.closeAllConnections(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await fetch(base + candle, { method: 'POST' })).status, 405)
  assert.equal((await fetch(base + candle, { headers: { Origin: 'https://evil.example' } })).status, 403)
  assert.equal((await fetch(base + '/api/upbit/orders')).status, 404)
  const response = await fetch(base + candle, { headers: { Origin: 'https://investai.example' } })
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), 'https://investai.example')
  assert.match(response.headers.get('server-timing'), /queue;dur=.*upbit;dur=.*MISS/)
  assert.ok(Number(response.headers.get('x-upbit-age-ms')) >= 0)
  assert.deepEqual(await response.json(), [{ ok: true }]); assert.equal(calls, 1)
})

test('SSE sends upstream status/data and releases its subscription when the browser disconnects', async t => {
  let listener, stops = 0
  const handler = createMarketHandler({ streams: { subscribe(_market, value) { listener = value; value.status('connecting', 0); return () => stops++ }, close() {} } })
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const controller = new AbortController()
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/upbit/stream?market=KRW-BTC`, { signal: controller.signal })
  assert.equal(response.headers.get('content-type'), 'text/event-stream')
  const reader = response.body.getReader()
  assert.match(new TextDecoder().decode((await reader.read()).value), /connecting/)
  listener.data({ code: 'KRW-BTC', type: 'ticker' }, Date.now() - 2000)
  const chunk = new TextDecoder().decode((await reader.read()).value)
  assert.match(chunk, /event: quote/); assert.match(chunk, /"ageMs":2\d{3}/)
  controller.abort(); await until(() => stops === 1)
})
