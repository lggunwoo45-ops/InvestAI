import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'node:http'
import { createMonitorHandler } from './server.mjs'
import { openStore } from './store.mjs'
import { telegramChannel } from './notifications.mjs'

const at = 1_800_000_000_000
const config = () => ({ requestId: 'one', instrument: { venue: 'binance-futures', asset: 'BTC', quote: 'USDT' }, source: { kind: 'review', id: 'review-1', revision: 'r1', at, price: 100, note: 'private note', signals: [] }, side: 'long', entry: [99, 101], target: 110, stop: 90, horizonHours: 1, costPercent: 0.2, notify: false })
async function directory(t) {
  const prefix = join(tmpdir(), 'investai-monitor-test-'), dir = await mkdtemp(prefix)
  t.after(async () => { assert.ok(resolve(dir).startsWith(resolve(prefix))); await rm(dir, { recursive: true, force: true }) })
  return dir
}
async function serve(options) {
  const handler = createMonitorHandler({ autoStart: false, ...options })
  await handler.ready
  const server = createServer((req, res) => { void handler(req, res, () => { res.statusCode = 404; res.end() }) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return { handler, base, async close() { await new Promise(resolve => server.close(resolve)); await handler.close() }, async get() { return (await fetch(base + '/api/monitor')).json() }, async post(path, value, extra = {}) {
    return fetch(base + '/api/monitor' + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-investai-monitor': '1', origin: base, ...extra }, body: JSON.stringify(value) })
  } }
}
test('HTTP registration is idempotent and origin guarded; persisted entries survive restart with immutable source', async t => {
  const dir = await directory(t); let now = at, price = 100
  let app = await serve({ directory: dir, clock: () => now, quoteReader: async () => ({ price, at: now, receivedAt: now }), channel: { configured: false } })
  try {
    assert.equal((await app.post('/rules', config(), { origin: 'https://unrelated.example' })).status, 403)
    assert.equal((await app.post('/rules', config(), { 'x-investai-monitor': '' })).status, 400)
    assert.equal((await app.post('/rules', config())).status, 200)
    assert.equal((await app.post('/rules', config())).status, 200)
    assert.equal((await app.get()).rules.length, 1)
    assert.equal((await app.post('/rules', { ...config(), stop: 80 })).status, 400)
    await app.handler.tick(); now += 15_000; await app.handler.tick()
    const before = (await app.get()).rules[0]; assert.equal(before.phase, 'tracking')
    await app.close()
    app = await serve({ directory: dir, clock: () => now, quoteReader: async () => ({ price, at: now, receivedAt: now }), channel: { configured: false } })
    now += 15_000; price = 112; await app.handler.tick()
    const r = (await app.get()).rules[0]
    assert.equal(r.result.kind, 'target'); assert.equal(r.hash, before.hash); assert.equal(r.config.source.note, 'private note'); assert.equal(r.events.length, 2)
    const stored = JSON.parse(await readFile(join(dir, 'ledger.json'), 'utf8')); assert.equal(stored.rules[0].result.kind, 'target')
  } finally { await app.close() }
})
test('restart after long outage closes tracking unresolved without invented return', async t => {
  const dir = await directory(t); let now = at
  let app = await serve({ directory: dir, clock: () => now, quoteReader: async () => ({ price: 100, at: now, receivedAt: now }), channel: { configured: false } })
  try {
    await app.post('/rules', config()); await app.handler.tick(); now += 15_000; await app.handler.tick(); await app.close(); now += 120_000
    app = await serve({ directory: dir, clock: () => now, quoteReader: async () => { throw new Error('offline') }, channel: { configured: false } })
    await app.handler.tick(); const r = (await app.get()).rules[0]
    assert.equal(r.result.kind, 'unresolved'); assert.equal(r.result.netPercent, null)
  } finally { await app.close() }
})
test('lock excludes a second writer and unreadable ledger is preserved', async t => {
  const dir = await directory(t), store = await openStore(dir)
  try { await assert.rejects(openStore(dir), /이미 실행/) } finally { await store.close() }
  await writeFile(join(dir, 'ledger.json'), '{invalid')
  await assert.rejects(openStore(dir), /원본 파일/)
  assert.equal(await readFile(join(dir, 'ledger.json'), 'utf8'), '{invalid')
})
test('failed notification remains uncertain across restart and is not duplicated', async t => {
  const dir = await directory(t); let now = at, calls = 0
  const options = { directory: dir, clock: () => now, quoteReader: async () => ({ price: 100, at: now, receivedAt: now }), channel: { configured: true, send: async () => { calls++; throw new Error('unknown delivery') } } }
  let app = await serve(options)
  try {
    await app.post('/rules', { ...config(), notify: true }); await app.handler.tick(); now += 15_000; await app.handler.tick(); await app.handler.dispatch()
    assert.equal((await app.get()).rules[0].events[0].delivery.status, 'uncertain'); assert.equal(calls, 1)
    await app.close(); app = await serve(options); now += 15_000; await app.handler.tick(); await app.handler.dispatch(); assert.equal(calls, 1)
  } finally { await app.close() }
})
test('notification is opt-in and token never appears in returned failure text', async () => {
  assert.equal(telegramChannel({}).configured, false)
  let payload
  const token = '12345:fake_token'
  const channel = telegramChannel({ INVESTAI_TELEGRAM_ENABLED: 'true', INVESTAI_TELEGRAM_BOT_TOKEN: token, INVESTAI_TELEGRAM_CHAT_ID: '123' }, async (_url, options) => { payload = JSON.parse(options.body); throw new Error(token) })
  await assert.rejects(channel.send({ config: config() }, { id: 'event1', kind: 'entry', price: 100, at }), e => !e.message.includes(token))
  assert.equal(payload.chat_id, '123'); assert.ok(!payload.text.includes('private note'))
})
test('slow notification delivery cannot block price observations', async t => {
  const dir = await directory(t); let now = at, price = 100, release
  const waiting = new Promise(resolve => { release = resolve })
  let sending
  const started = new Promise(resolve => { sending = resolve })
  const app = await serve({ directory: dir, clock: () => now, quoteReader: async () => ({ price, at: now, receivedAt: now }), channel: { configured: true, send: async () => { sending(); await waiting } } })
  try {
    await app.post('/rules', { ...config(), notify: true }); await app.handler.tick(); now += 15_000; await app.handler.tick()
    const dispatching = app.handler.dispatch(); await started
    now += 15_000; price = 112; await app.handler.tick()
    assert.equal((await app.get()).rules[0].result.kind, 'target')
    release(); await dispatching
  } finally { release(); await app.close() }
})
