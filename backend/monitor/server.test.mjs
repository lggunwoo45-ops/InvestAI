import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'node:http'
import { createMonitorHandler } from './server.mjs'
import { openStore } from './store.mjs'
import { telegramChannel } from './notifications.mjs'
import { defaultExplorerConfig } from '../research/signals.mjs'

const at = 1_800_000_000_000
const config = () => ({ requestId: 'one', instrument: { venue: 'binance-futures', asset: 'BTC', quote: 'USDT' }, source: { kind: 'review', id: 'review-1', revision: 'r1', at, price: 100, note: 'private note', signals: [] }, side: 'long', entry: [99, 101], target: 110, stop: 90, horizonHours: 1, costPercent: 0.2, notify: false })
const connectionConfig = () => ({ requestId: 'public-connection-1', venue: 'hyperliquid', account: `0x${'a'.repeat(40)}`, label: 'private label', notify: false, thresholds: { distance: 5, loss: 10, leverage: null } })
const position = () => ({ key: 'BTC:long', asset: 'BTC', side: 'long', size: 1, entryPrice: 100, currentPrice: 100, liquidationPrice: 80, unrealizedPnl: 0, leverage: 5, marginType: 'cross', quote: 'USDC' })
test('connected positions persist with risk events, enforce bound direction, and stop signals when positions close', async t => {
  const dir = await directory(t); let now = at, positions = [position()], offline = false
  const options = { directory: dir, clock: () => now, channel: { configured: false }, positionReader: async () => { if (offline) throw new Error('offline'); return { receivedAt: now, sourceAt: now, positions } } }
  let app = await serve(options)
  try {
    assert.equal((await app.post('/connections', connectionConfig(), { origin: 'https://evil.example' })).status, 403)
    assert.equal((await app.post('/connections', { ...connectionConfig(), notify: true })).status, 400)
    await app.post('/connections', connectionConfig()); await app.post('/connections', connectionConfig())
    assert.equal((await app.get()).connections.length, 1)
    const id = (await app.get()).connections[0].id
    const signal = { requestId: 'bound-signal-1', name: '반대 방향', asset: 'BTC', notify: false, purpose: 'opposition', holdingSide: 'long', positionRef: { connectionId: id, key: 'BTC:long' }, config: { ...defaultExplorerConfig, signals: ['ema-short'], side: 'short' } }
    assert.equal((await app.post('/signals', signal)).status, 400)
    await app.handler.tickPositions()
    assert.equal((await app.post('/signals', { ...signal, holdingSide: 'short' })).status, 400)
    assert.equal((await app.post('/signals', signal)).status, 200)
    assert.equal((await app.post('/signals', { ...signal, requestId: 'bound-signal-2' })).status, 400)
    now += 30000; positions = [{ ...position(), currentPrice: 82, unrealizedPnl: -18 }]; await app.handler.tickPositions()
    assert.equal((await app.get()).connections[0].events.filter(e => e.kind === 'loss').length, 1)
    await app.close(); app = await serve(options)
    assert.equal((await app.get()).connections[0].events.length, 3)
    now += 30000; offline = true; await app.handler.tickPositions()
    let current = await app.get(); assert.equal(current.signals[0].active, true); assert.match(current.signals[0].issue, /보류/); assert.equal(current.connections[0].snapshot.positions.length, 1)
    now += 30000; offline = false; positions = []; await app.handler.tickPositions()
    current = await app.get(); assert.equal(current.signals[0].active, false); assert.match(current.signals[0].issue, /사라지거나/)
    assert.equal((await app.post('/connections/remove', { id })).status, 200)
    assert.equal((await app.get()).connections.length, 0)
    const saved = await readFile(join(dir, 'ledger.json'), 'utf8'); assert.ok(!saved.includes(connectionConfig().account)); assert.ok(!saved.includes('private label')); assert.equal(JSON.parse(saved).signals.length, 1)
  } finally { await app.close() }
})
test('disconnect during an in-flight position read cannot resurrect data; delivery is redacted and deduplicated', async t => {
  const dir = await directory(t); let now = at, unblock, delivered = [], hold = false
  const app = await serve({ directory: dir, clock: () => now, channel: { configured: true, send: async (r, e) => { delivered.push({ r, e }) } }, positionReader: async () => { if (hold) await new Promise(resolve => { unblock = resolve }); return { receivedAt: now, sourceAt: now, positions: [position()] } } })
  try {
    await app.post('/connections', { ...connectionConfig(), notify: true }); await app.handler.tickPositions()
    await app.handler.dispatch(); await app.handler.dispatch(); assert.equal(delivered.length, 1)
    assert.ok(!JSON.stringify(delivered).includes('private label')); assert.ok(!JSON.stringify(delivered).includes(connectionConfig().account))
    const c = (await app.get()).connections[0]; assert.equal(c.events[0].delivery.status, 'sent')
    hold = true; now += 30000; const pending = app.handler.tickPositions()
    while (!unblock) await new Promise(resolve => setTimeout(resolve, 1))
    await app.post('/connections/remove', { id: c.id }); unblock(); await pending
    assert.deepEqual((await app.get()).connections, [])
  } finally { unblock?.(); await app.close() }
})
test('signal registrations persist, stay idempotent and cannot bypass origin/channel checks', async t => {
  const dir = await directory(t)
  const signal = { requestId: 'signal-integration-1', asset: 'BTC', name: '거래량 확인', notify: false, purpose: 'opportunity', config: { ...defaultExplorerConfig, window: 1, signals: ['volume-long'] } }
  let rows = Array.from({ length: 80 }, (_, i) => ({ timestamp: at + i * 3600000, open: 100, high: 101, low: 99, close: 100, volume: 10 }))
  const options = { directory: dir, clock: () => at + 82 * 3600000, channel: { configured: false }, historyReader: async () => ({ asset: 'BTC', timeframe: '1h', asOf: rows.at(-1).timestamp + 3600001, candles: rows }) }
  let app = await serve(options)
  try {
    assert.equal((await app.post('/signals', signal, { origin: 'https://evil.example' })).status, 403)
    assert.equal((await app.post('/signals', { ...signal, notify: true })).status, 400)
    assert.equal((await app.post('/signals', signal)).status, 200); await app.post('/signals', signal)
    assert.equal((await app.get()).signals.length, 1)
    assert.equal((await app.post('/signals', { ...signal, name: '다른 이름' })).status, 400)
    await app.handler.tickSignals()
    rows = [...rows, { timestamp: at + 80 * 3600000, open: 100, high: 101, low: 100, close: 101, volume: 40 }]
    await app.handler.tickSignals(); const before = (await app.get()).signals[0]
    assert.equal(before.events.length, 1)
    await app.close(); app = await serve(options)
    await app.handler.tickSignals(); const after = (await app.get()).signals[0]
    assert.equal(after.events.length, 1); assert.equal(after.hash, before.hash)
    await app.post('/signals/stop', { id: before.id }); assert.equal((await app.get()).signals[0].events[0].outcome, 'cancelled')
  } finally { await app.close() }
})

test('slow signal history cannot block the independent price monitor cycle', async t => {
  const dir = await directory(t); let release
  const app = await serve({ directory: dir, channel: { configured: false }, clock: () => at, quoteReader: async () => ({ price: 100, at, receivedAt: at }), historyReader: () => new Promise(resolve => { release = resolve }) })
  try {
    await app.post('/rules', config())
    await app.post('/signals', { requestId: 'slow-signals-1', asset: 'BTC', name: '신호 확인', notify: false, config: defaultExplorerConfig })
    const pending = app.handler.tickSignals(); await new Promise(resolve => setTimeout(resolve, 10))
    await app.handler.tick(); assert.equal((await app.get()).rules[0].last.price, 100)
    release({ asset: 'BTC', timeframe: '1h', candles: [], asOf: at }); await pending
  } finally { await app.close() }
})
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
