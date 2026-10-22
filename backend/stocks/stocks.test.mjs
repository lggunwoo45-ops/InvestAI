import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createKisClient, normalizeHistory, normalizeQuote, stockSymbol } from './kis.mjs'
import { createStockHandler } from './server.mjs'

const at = Date.parse('2026-10-22T03:00:00Z')
const quote = { stck_prpr: '70000', prdy_ctrt: '-1.2', acml_vol: '12345' }
const bar = { stck_bsop_date: '20261021', stck_oprc: '69000', stck_hgpr: '71000', stck_lwpr: '68000', stck_clpr: '70000', acml_vol: '12345' }
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
function fixture(overrides = {}) {
  const calls = []
  const client = createKisClient({ appKey: 'test-key', appSecret: 'test-secret', spacing: 0, now: () => at, fetchImpl: async (url, init) => {
    calls.push({ url, init })
    if (url.includes('tokenP')) return json({ access_token: 'test-token', expires_in: 86400 })
    return json({ rt_cd: '0', ...(url.includes('inquire-price') ? { output: quote } : { output2: [bar] }) })
  }, ...overrides })
  return { client, calls }
}
test('missing credentials do not call a provider; symbols cannot become arbitrary paths', async () => {
  let count = 0
  const client = createKisClient({ appKey: '', appSecret: '', fetchImpl: () => { count++; throw new Error('unexpected') } })
  await assert.rejects(client.snapshot('005930'), /stock_setup_required/)
  for (const value of ['../orders', 'https://evil.test', '005930&x=y', ' 005930', '12345']) assert.throws(() => stockSymbol(value), /invalid_symbol/)
  assert.equal(count, 0)
})
test('concurrent readers share quote/history/token; caching never changes quote receipt time', async () => {
  let time = at
  const { client, calls } = fixture({ now: () => time })
  const [a, b] = await Promise.all([client.snapshot('005930'), client.snapshot('005930')])
  assert.deepEqual(a, b); assert.equal(calls.length, 3)
  time += 29_000
  assert.equal((await client.snapshot('005930')).quote.fetchedAt, at)
  time += 2000
  assert.equal((await client.snapshot('005930')).quote.fetchedAt, time)
  assert.equal(calls.length, 4)
  const publicJson = JSON.stringify(a)
  for (const secret of ['test-token', 'test-secret', 'test-key']) assert.ok(!publicJson.includes(secret))
  assert.ok(calls.every(call => call.url.startsWith('https://openapi.koreainvestment.com:9443/')))
  assert.equal(new URL(calls[2].url).searchParams.get('FID_ORG_ADJ_PRC'), '0')
  assert.equal(calls[1].init.headers.tr_id, 'FHKST01010100')
})
test('authentication errors are cooled down without disclosing upstream details', async () => {
  let count = 0, time = at
  const { client } = fixture({ now: () => time, fetchImpl: async () => { count++; return json({ error_description: 'test-secret' }) } })
  await assert.rejects(client.snapshot('005930'), /authentication_failed/)
  await assert.rejects(client.snapshot('000660'), /provider_wait/)
  time += 31_000
  await assert.rejects(client.snapshot('000660'), /authentication_wait/)
  assert.equal(count, 1)
})
test('invalid or unavailable history preserves a valid quote without inventing candles', async () => {
  const { client } = fixture({ fetchImpl: async url => url.includes('tokenP') ? json({ access_token: 'x', expires_in: 86400 }) : url.includes('inquire-price') ? json({ rt_cd: '0', output: quote }) : json({ rt_cd: '1', msg1: 'secret error' }) })
  const result = await client.snapshot('005930')
  assert.equal(result.quote.price, 70000); assert.deepEqual(result.candles, []); assert.equal(result.historyError, 'provider_rejected')
})
test('normalization rejects invalid prices, future/invalid dates and impossible OHLC', () => {
  for (const price of ['0', '-1', '', 'Infinity', null]) assert.throws(() => normalizeQuote({ ...quote, stck_prpr: price }, '005930', at), /invalid_quote/)
  const rows = [bar, { ...bar, stck_bsop_date: '20261020' }, bar, { ...bar, stck_bsop_date: '20261023' }, { ...bar, stck_bsop_date: '20260230' }, { ...bar, stck_bsop_date: '20261019', stck_hgpr: '1' }]
  assert.deepEqual(normalizeHistory(rows, '20261022').map(c => new Date(c.timestamp).toISOString().slice(0, 10)), ['2026-10-20', '2026-10-21'])
  assert.throws(() => normalizeHistory([], '20261022'), /invalid_history/)
})
test('response payloads and pending upstream work are bounded', async () => {
  const { client } = fixture({ fetchImpl: async () => new Response('x'.repeat(1_000_001)) })
  await assert.rejects(client.snapshot('005930'), /invalid_response/)
})
async function withServer(options, callback) {
  const server = createServer(createStockHandler(options))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try { await callback(`http://127.0.0.1:${server.address().port}`) } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}
test('public access is disabled by default even when credentials exist', async () => {
  let calls = 0
  await withServer({ client: { snapshot: () => { calls++; return {} } }, publicEnabled: false }, async base => {
    const response = await fetch(`${base}/api/stocks/snapshot?symbol=005930`)
    assert.equal(response.status, 503); assert.equal((await response.json()).error, 'stock_public_disabled')
  })
  assert.equal(calls, 0)
})
test('HTTP handler enforces origin, method, query and a shared request limit', async () => {
  let calls = 0
  const client = { snapshot: async symbol => { stockSymbol(symbol); calls++; return { symbol } } }
  await withServer({ local: true, client }, async base => {
    assert.equal((await fetch(`${base}/api/stocks/snapshot?symbol=005930`, { headers: { origin: 'https://evil.test' } })).status, 403)
    assert.equal((await fetch(`${base}/api/stocks/snapshot?symbol=005930`, { method: 'POST' })).status, 405)
    assert.equal((await fetch(`${base}/api/stocks/snapshot?symbol=005930&symbol=000660`)).status, 400)
    assert.equal((await fetch(`${base}/api/stocks/snapshot?symbol=005930&url=https://evil.test`)).status, 400)
    const response = await fetch(`${base}/api/stocks/snapshot?symbol=005930`, { headers: { origin: base } })
    assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), base)
    assert.equal(calls, 1)
    for (let i = 0; i < 117; i++) await fetch(`${base}/api/stocks/snapshot?symbol=005930`)
    assert.equal((await fetch(`${base}/api/stocks/snapshot?symbol=005930`)).status, 429)
  })
})
