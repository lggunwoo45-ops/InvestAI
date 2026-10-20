import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createMarketHandler } from './server.mjs'
import { createRest } from './rest.mjs'
import { verifyRelay, validateTarget } from './verify-relay.mjs'

const origin = 'https://lggunwoo45-ops.github.io'
const market = 'KRW-BTC'
const sample = () => ({ market, trade_price: 100 })
const quote = () => ({ type: 'ticker', code: market, trade_price: 100, timestamp: Date.now(), trade_timestamp: Date.now() })

async function setup(t, { origins = [origin], fetchImpl, message = quote, delay = 0, wrap, clockOffset = 0 } = {}) {
  let stopped = 0, requested = 0
  const handler = createMarketHandler({
    origins,
    rest: createRest({ interval: 0, fetchImpl: fetchImpl ?? (async () => {
      requested++
      return new Response(JSON.stringify([sample()]), { headers: { Date: new Date(Date.now() + clockOffset).toUTCString() } })
    }) }),
    streams: {
      subscribe(_market, target) {
        target.status('live', 0)
        const timer = setTimeout(() => target.data(message(), Date.now()), delay)
        return () => { stopped++; clearTimeout(timer) }
      },
      close() {},
    },
  })
  const server = createServer(wrap ? wrap(handler) : handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { handler.close(); server.closeAllConnections(); server.close() })
  return { base: `http://127.0.0.1:${server.address().port}/api/upbit`, stopped: () => stopped, requested: () => requested }
}

test('deployment check accepts HTTPS or local relay addresses, rejects credentials and ambiguous paths', () => {
  assert.equal(validateTarget('https://quotes.example/api/upbit', origin, market), 'https://quotes.example/api/upbit')
  for (const base of ['http://quotes.example/api/upbit', 'https://u:p@quotes.example/api/upbit', 'https://quotes.example/api/upbit?token=secret', 'https://quotes.example/api/upbit#x', 'https://quotes.example/api/upbit/']) {
    assert.throws(() => validateTarget(base, origin, market))
  }
  assert.throws(() => validateTarget('https://quotes.example/api/upbit', origin + '/InvestAI/', market))
})

test('deployment check reads catalog, three histories and a fresh stream through the actual HTTP boundary', async t => {
  const server = await setup(t)
  const result = await verifyRelay({ base: server.base, origin })
  assert.equal(result.observations.length, 6)
  assert.equal(result.allHistoriesUncached, true)
  assert.equal(server.requested(), 4)
  assert.ok(result.observations.some(row => row.market === market && row.firstLiveTickerMs >= 0))
  // A subsequent warm run is explicitly distinguished from a cold measurement.
  const warm = await verifyRelay({ base: server.base, origin })
  assert.equal(warm.allHistoriesUncached, false)
})

test('deployment check rejects a relay that would block the actual website origin', async t => {
  const server = await setup(t, { origins: ['https://different.example'] })
  await assert.rejects(verifyRelay({ base: server.base, origin }), /HTTP 403/)
  assert.equal(server.requested(), 0)
})

test('a successful health response cannot mask broken market data', async t => {
  const server = await setup(t, { fetchImpl: async () => new Response('[]', { status: 500 }) })
  await assert.rejects(verifyRelay({ base: server.base, origin }), /HTTP 502/)
})

test('an old exchange event does not pass verification just because its relay receipt is fresh', async t => {
  const server = await setup(t, { message: () => ({ ...quote(), timestamp: Date.now() - 120_000 }) })
  await assert.rejects(verifyRelay({ base: server.base, origin, timeoutMs: 250 }), /timed out/)
})

test('a PC clock five minutes ahead does not reject fresh exchange data', async t => {
  const server = await setup(t, {
    clockOffset: -310_000,
    message: () => ({ ...quote(), timestamp: Date.now() - 310_000, trade_timestamp: Date.now() - 311_000 }),
  })
  assert.ok((await verifyRelay({ base: server.base, origin })).observations.some(row => row.firstLiveTickerMs >= 0))
})

test('a fresh ticker with an old last trade does not satisfy the analysis readiness check', async t => {
  const server = await setup(t, { message: () => ({ ...quote(), trade_timestamp: Date.now() - 120_000 }) })
  await assert.rejects(verifyRelay({ base: server.base, origin, timeoutMs: 250 }), /timed out/)
})

test('a buffered stream that never delivers quotes has a bounded wait and releases the server subscription', async t => {
  const server = await setup(t, { delay: 10_000 })
  await assert.rejects(verifyRelay({ base: server.base, origin, timeoutMs: 250 }), /timed out/)
  for (let i = 0; i < 100 && !server.stopped(); i++) await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(server.stopped(), 1)
})

test('a proxy returning HTML for the stream fails verification', async t => {
  const server = await setup(t, {
    wrap: handler => (req, res) => {
      if (!req.url.startsWith('/api/upbit/stream')) return handler(req, res)
      res.writeHead(200, { 'Access-Control-Allow-Origin': origin, 'Content-Type': 'text/html' })
      res.end('<html>loading</html>')
    },
  })
  await assert.rejects(verifyRelay({ base: server.base, origin }), /event stream/)
})

test('health probes stay available after the user request quota is exhausted, without releasing that quota', async t => {
  const server = await setup(t)
  for (let i = 0; i < 120; i++) {
    const response = await fetch(server.base + '/orders')
    assert.equal(response.status, 404)
    await response.body.cancel()
  }
  assert.equal((await fetch(server.base + '/health')).status, 200)
  assert.equal((await fetch(server.base + '/orders')).status, 429)
  assert.equal((await fetch(server.base + '/health', { headers: { Origin: 'https://other.example' } })).status, 403)
})
