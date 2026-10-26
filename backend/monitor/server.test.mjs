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
import { PrivatePositionError } from './privatePositions.mjs'

const at = 1_800_000_000_000
const config = () => ({ requestId: 'one', instrument: { venue: 'binance-futures', asset: 'BTC', quote: 'USDT' }, source: { kind: 'review', id: 'review-1', revision: 'r1', at, price: 100, note: 'private note', signals: [] }, side: 'long', entry: [99, 101], target: 110, stop: 90, horizonHours: 1, costPercent: 0.2, notify: false })
const connectionConfig = () => ({ requestId: 'public-connection-1', venue: 'hyperliquid', account: `0x${'a'.repeat(40)}`, label: 'private label', notify: false, thresholds: { distance: 5, loss: 10, leverage: null } })
const position = () => ({ key: 'BTC:long', asset: 'BTC', side: 'long', size: 1, entryPrice: 100, currentPrice: 100, liquidationPrice: 80, unrealizedPnl: 0, leverage: 5, marginType: 'cross', quote: 'USDC' })
const password = 'fixture-vault-password-only'
const privateConfig = () => ({ requestId: 'private-connection-1', venue: 'bybit', label: 'API 보유 계정', notify: false, thresholds: { distance: 5, loss: 10, leverage: null }, consent: true, credentials: { apiKey: 'fixture_key_123456789', apiSecret: 'fixture_secret_123456789' } })

test('connection settings persist, reject stale edits and refresh errors preserve the last successful snapshot', async t => {
  const dir = await directory(t); let now = at, failRead = false, calls = 0
  const options = { directory: dir, clock: () => now, channel: { configured: false }, positionReader: async () => { calls++; if (failRead) throw new Error('offline'); return { receivedAt: now, sourceAt: now, positions: [position()] } } }
  let app = await serve(options)
  try {
    await app.post('/connections', connectionConfig())
    let c = (await app.get()).connections[0]
    const edit = { id: c.id, revision: 0, label: '수정한 계정', notify: false, thresholds: { distance: 3, loss: null, leverage: 7 }, account: 'not-allowed-to-change', venue: 'bybit' }
    assert.equal((await app.post('/connections/update', edit)).status, 200)
    assert.equal((await app.post('/connections/update', edit)).status, 409)
    assert.equal((await app.post('/connections/update', { ...edit, revision: 1, notify: true })).status, 400)
    assert.equal((await app.post('/connections/update', { ...edit, revision: 1, thresholds: { distance: -1, loss: null, leverage: null } })).status, 400)
    c = (await app.get()).connections[0]
    assert.equal(c.config.venue, 'hyperliquid'); assert.equal(c.config.account, connectionConfig().account)
    assert.equal((await app.post('/connections/refresh', { id: c.id, revision: 1 })).status, 200)
    const success = (await app.get()).connections[0].snapshot
    assert.equal((await app.post('/connections/refresh', { id: c.id, revision: 1 })).status, 429); assert.equal(calls, 1)
    now += 31000; failRead = true
    assert.equal((await app.post('/connections/refresh', { id: c.id, revision: 1 })).status, 200)
    c = (await app.get()).connections[0]; assert.deepEqual(c.snapshot, success); assert.ok(c.issue); assert.equal(c.lastAttemptAt, now)
    await app.close(); app = await serve(options)
    c = (await app.get()).connections[0]; assert.equal(c.config.label, edit.label); assert.equal(c.revision, 1); assert.equal(c.lastAttemptAt, now)
    await app.post('/connections/pause', { id: c.id, paused: true })
    assert.equal((await app.post('/connections/refresh', { id: c.id, revision: 2 })).status, 400)
  } finally { await app.close() }
})

test('verified key replacement keeps history, stops bound signals, survives restart and never persists rejected keys', async t => {
  const dir = await directory(t); let now = at, seen
  const replacement = { apiKey: 'new_fixture_key_123456', apiSecret: 'new_fixture_secret_123456' }
  const options = { directory: dir, clock: () => now, channel: { configured: false }, privateReader: async (_venue, keys) => {
    seen = keys
    if (keys.apiKey.startsWith('denied')) throw new PrivatePositionError('읽기 전용 키가 아닙니다.')
    return { receivedAt: now, sourceAt: now, positions: [{ ...position(), quote: 'USDT' }] }
  } }
  let app = await serve(options)
  try {
    await app.post('/vault/setup', { password }); await app.post('/connections/private', privateConfig())
    let c = (await app.get()).connections[0]; const originalEvents = c.events.length
    const sig = { requestId: 'bound-rotation-test', name: 'opposite', asset: 'BTC', notify: false, purpose: 'opposition', holdingSide: 'long', positionRef: { connectionId: c.id, key: 'BTC:long' }, config: { ...defaultExplorerConfig, signals: ['ema-short'], side: 'short', timeframe: '1h' } }
    assert.equal((await app.post('/signals', sig)).status, 200)
    const request = { id: c.id, revision: 0, credentials: replacement, consent: true }
    assert.equal((await app.post('/connections/credentials', { ...request, consent: false })).status, 400)
    assert.equal((await app.post('/connections/credentials', { ...request, credentials: { ...replacement, apiKey: 'denied_fixture_key_123456' } })).status, 400)
    now += 1000; await app.handler.tickPositions(); assert.deepEqual(seen, privateConfig().credentials)
    assert.equal((await app.post('/connections/credentials', request)).status, 200)
    const state = await app.get(); c = state.connections[0]
    assert.equal(c.revision, 1); assert.equal(c.credentialsUpdatedAt, now); assert.equal(state.signals[0].active, false)
    assert.ok(c.events.length > originalEvents); assert.equal(c.events.some(e => ['closed', 'opened'].includes(e.kind)), false)
    assert.equal((await app.post('/connections/credentials', request)).status, 409)
    for (const value of Object.values(replacement)) assert.ok(!JSON.stringify(state).includes(value))
    const ledger = await readFile(join(dir, 'ledger.json'), 'utf8')
    for (const value of [...Object.values(replacement), ...Object.values(privateConfig().credentials)]) assert.ok(!ledger.includes(value))
    await app.close(); app = await serve(options); await app.post('/vault/unlock', { password }); now += 1000
    await app.handler.tickPositions(); assert.deepEqual(seen, replacement)
  } finally { await app.close() }
})

test('in-flight old-key responses cannot overwrite a verified key replacement', async t => {
  const dir = await directory(t); let now = at, block = false, unblock, started
  const began = new Promise(resolve => { started = resolve }), gate = new Promise(resolve => { unblock = resolve })
  const replacement = { apiKey: 'replacement_key_123456', apiSecret: 'replacement_secret_123456' }
  const app = await serve({ directory: dir, clock: () => now, channel: { configured: false }, privateReader: async (_venue, keys) => {
    if (block && keys.apiKey === privateConfig().credentials.apiKey) { started(); await gate; return { receivedAt: now, sourceAt: null, positions: [] } }
    return { receivedAt: now, sourceAt: null, positions: [{ ...position(), quote: 'USDT' }] }
  } })
  try {
    await app.post('/vault/setup', { password }); await app.post('/connections/private', privateConfig())
    const c = (await app.get()).connections[0]; now += 1000; block = true
    const reading = app.handler.tickPositions(); await began
    assert.equal((await app.post('/connections/credentials', { id: c.id, revision: 0, credentials: replacement, consent: true })).status, 200)
    unblock(); await reading
    const final = (await app.get()).connections[0]; assert.equal(final.snapshot.positions.length, 1); assert.equal(final.revision, 1)
  } finally { unblock(); await app.close() }
})

test('private account keys are encrypted atomically, never exposed in status, and restart requires unlock', async t => {
  const dir = await directory(t); let now = at, calls = 0
  const options = { directory: dir, clock: () => now, channel: { configured: false }, privateReader: async (venue, credentials) => { calls++; assert.equal(venue, 'bybit'); assert.deepEqual(credentials, privateConfig().credentials); return { receivedAt: now, sourceAt: null, positions: [{ ...position(), quote: 'USDT' }] } } }
  let app = await serve(options)
  try {
    assert.equal((await app.post('/connections/private', privateConfig())).status, 400); assert.equal(calls, 0)
    assert.equal((await app.post('/vault/setup', { password }, { origin: 'https://evil.example' })).status, 403)
    assert.equal((await app.post('/vault/setup', { password })).status, 200)
    assert.equal((await app.post('/vault/setup', { password })).status, 400)
    assert.equal((await app.post('/connections/private', { ...privateConfig(), consent: false })).status, 400)
    assert.equal((await app.post('/connections/private', privateConfig())).status, 200)
    assert.equal((await app.post('/connections/private', privateConfig())).status, 200); assert.equal(calls, 1)
    assert.equal((await app.post('/connections/private', { ...privateConfig(), requestId: 'duplicate-key-1' })).status, 400)
    const status = await app.get(), c = status.connections[0]
    assert.equal(c.snapshot.positions[0].quote, 'USDT')
    assert.deepEqual(status.vault, { configured: true, unlocked: true })
    const disk = await readFile(join(dir, 'ledger.json'), 'utf8')
    for (const secret of [password, ...Object.values(privateConfig().credentials)]) { assert.ok(!disk.includes(secret)); assert.ok(!JSON.stringify(status).includes(secret)) }
    assert.ok(JSON.parse(disk).vault.items[0].box.data); assert.ok(!JSON.stringify(status).includes('scrypt'))
    const signal = { requestId: 'private-bound-signal-1', name: '반대 추세', asset: 'BTC', notify: false, purpose: 'opposition', holdingSide: 'long', positionRef: { connectionId: c.id, key: 'BTC:long' }, config: { ...defaultExplorerConfig, signals: ['ema-short'], side: 'short' } }
    assert.equal((await app.post('/signals', signal)).status, 200)
    await app.close(); app = await serve(options)
    const count = calls; now += 30000; await app.handler.tickPositions()
    assert.equal(calls, count); assert.deepEqual((await app.get()).vault, { configured: true, unlocked: false })
    assert.match((await app.get()).signals[0].issue, /보류/)
    assert.equal((await app.post('/vault/unlock', { password: 'wrong-password-value' })).status, 400)
    assert.equal((await app.post('/vault/unlock', { password })).status, 200)
    now += 30000; await app.handler.tickPositions(); assert.ok(calls > count)
    assert.equal((await app.get()).connections[0].issue, null)
    await app.post('/vault/lock', {})
    assert.equal((await app.post('/connections/remove', { id: c.id })).status, 200)
    assert.equal((await app.get()).signals[0].active, false)
    assert.equal(JSON.parse(await readFile(join(dir, 'ledger.json'), 'utf8')).vault.items.length, 0)
  } finally { await app.close() }
})

test('failed permission checks store no keys; locking cancels in-flight registration and polling without inventing closure', async t => {
  const dir = await directory(t); let now = at, hold = false, deny = true, release, queriedSignal
  const app = await serve({ directory: dir, clock: () => now, channel: { configured: false }, privateReader: async (_v, _c, signal) => {
    queriedSignal = signal
    if (deny) throw new PrivatePositionError('읽기 전용 확인 실패')
    if (hold) await new Promise(resolve => { release = resolve })
    return { receivedAt: now, sourceAt: null, positions: [{ ...position(), quote: 'USDT' }] }
  } })
  try {
    await app.post('/vault/setup', { password })
    assert.equal((await app.post('/connections/private', privateConfig())).status, 400)
    assert.equal(JSON.parse(await readFile(join(dir, 'ledger.json'), 'utf8')).vault.items.length, 0)
    deny = false; hold = true
    const pending = app.post('/connections/private', privateConfig())
    while (!release) await new Promise(resolve => setTimeout(resolve, 1))
    await app.post('/vault/lock', {}); assert.equal(queriedSignal.aborted, true); release(); assert.equal((await pending).status, 400)
    assert.equal((await app.get()).connections.length, 0)
    hold = false; await app.post('/vault/unlock', { password }); await app.post('/connections/private', privateConfig())
    hold = true; release = null; now += 30000
    const polling = app.handler.tickPositions()
    while (!release) await new Promise(resolve => setTimeout(resolve, 1))
    await app.post('/vault/lock', {}); release(); await polling
    const c = (await app.get()).connections[0]
    assert.equal(c.snapshot.receivedAt, at); assert.match(c.issue, /잠겨/); assert.equal(c.events.some(e => e.kind === 'closed'), false)
    await app.post('/connections', connectionConfig())
    assert.equal((await app.post('/vault/remove', {})).status, 400)
    assert.equal((await app.post('/vault/remove', { confirm: true })).status, 200)
    assert.deepEqual((await app.get()).connections.map(c => c.config.venue), ['hyperliquid'])
    assert.equal(JSON.parse(await readFile(join(dir, 'ledger.json'), 'utf8')).vault, undefined)
  } finally { release?.(); await app.close() }
})

test('a corrupt or orphaned vault is preserved and never silently replaced', async t => {
  const dir = await directory(t)
  const raw = JSON.stringify({ version: 1, rules: [], vault: { version: 1, items: [null] } })
  await writeFile(join(dir, 'ledger.json'), raw)
  await assert.rejects(() => openStore(dir), /원본 파일을 보존/)
  assert.equal(await readFile(join(dir, 'ledger.json'), 'utf8'), raw)
})
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


test('derivative registration is capability gated; a shared lookup failure spares price-only signals and pending outcomes', async t => {
  const dir = await directory(t), step = 3600000
  let rows = Array.from({ length: 80 }, (_, i) => ({ timestamp: at + i * step, open: 100, high: 101, low: 99, close: 100, volume: 10 }))
  let broken = false, reads = 0, sends = 0
  const signal = { requestId: 'filtered-integration-1', asset: 'BTC', name: '파생 확인', notify: true, config: { ...defaultExplorerConfig, window: 1, signals: ['volume-long'], funding: 'positive', openInterest: 'rising' } }
  const options = { directory: dir, clock: () => at + 90 * step, channel: { configured: true, send: async (_rule, event) => { sends++; assert.ok(event.derivatives); throw new Error('delivery uncertain') } }, historyReader: async () => ({ asset: 'BTC', timeframe: '1h', asOf: rows.at(-1).timestamp + step + 1, candles: rows }) }
  let app = await serve(options)
  try {
    assert.equal((await app.get()).derivativeSignalsAvailable, false)
    assert.equal((await app.post('/signals', signal)).status, 400)
    await app.close()
    options.derivativeContextReader = async (asset, timeframe, from, to) => {
      reads++; if (broken) throw new Error('offline')
      return { method: 'investai-derivatives-asof-1', asset, timeframe, from, to, points: Array.from({ length: (to - from) / step + 1 }, (_, i) => { const at = from + i * step; return { at, funding: { at: at - step, knownAt: at - 1, value: .0001 }, openInterest: { at: at - step, knownAt: at - 1, value: 110, previousAt: at - 25 * step, previousKnownAt: at - step, previousValue: 100, change24h: 10 } } }) }
    }
    app = await serve(options)
    assert.equal((await app.get()).derivativeSignalsAvailable, true)
    assert.equal((await app.post('/signals', signal)).status, 200)
    assert.equal((await app.post('/signals', signal)).status, 200)
    assert.equal((await app.post('/signals', { ...signal, config: { ...signal.config, funding: 'negative' } })).status, 400)
    await app.post('/signals', { ...signal, requestId: 'price-only-integration-1', notify: false, config: { ...signal.config, funding: 'any', openInterest: 'any' } })
    await app.handler.tickSignals(); assert.equal(reads, 1)
    rows.push({ timestamp: at + 80 * step, open: 100, high: 101, low: 100, close: 101, volume: 40 })
    await app.handler.tickSignals()
    let state = await app.get(); assert.equal(state.signals[0].events.length, 1); assert.equal(state.signals[1].events.length, 1)
    await app.handler.dispatch(); assert.equal(sends, 1)
    const hash = state.signals[0].hash
    await app.close(); app = await serve(options)
    await app.handler.dispatch(); assert.equal(sends, 1) // interrupted/uncertain delivery is not retried
    broken = true
    rows.push({ timestamp: at + 81 * step, open: 101, high: 105, low: 100.9, close: 104, volume: 10 })
    await app.handler.tickSignals(); state = await app.get()
    assert.equal(state.running, true); assert.equal(state.signals[0].hash, hash)
    assert.equal(state.signals[0].events[0].outcome, 'up'); assert.equal(state.signals[0].derivativeState, 'unknown')
    rows.push({ timestamp: at + 82 * step, open: 100, high: 101, low: 100, close: 101, volume: 40 })
    await app.handler.tickSignals(); state = await app.get()
    assert.equal(state.signals[0].events.length, 1); assert.equal(state.signals[1].events.length, 2)
    broken = false
    rows.push({ timestamp: at + 83 * step, open: 100, high: 101, low: 100, close: 101, volume: 40 })
    await app.handler.tickSignals(); state = await app.get()
    assert.equal(state.signals[0].events.length, 1); assert.equal(state.signals[0].issue, null)
    assert.equal(state.signals[0].events[0].delivery.status, 'uncertain')
  } finally { await app.close() }
})

test('Telegram signal message includes selected derivative evidence without sending to a live recipient', async () => {
  let payload
  const channel = telegramChannel({ INVESTAI_TELEGRAM_ENABLED: 'true', INVESTAI_TELEGRAM_BOT_TOKEN: '123:fixture-token', INVESTAI_TELEGRAM_CHAT_ID: '123' }, async (_url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }) })
  await channel.send({ config: { instrument: { venue: 'binance-futures', symbol: 'BTCUSDT', quote: 'USDT' }, side: 'long' } }, { id: 'test-evidence', at, kind: 'signal', price: 100, derivatives: { at: at + 3600000, funding: { value: .0001 }, openInterest: { change24h: 10 } } })
  assert.match(payload.text, /Bybit/); assert.match(payload.text, /0.0100%/); assert.match(payload.text, /10.00%/); assert.match(payload.text, /봉 종료 전 저장 자료/)
})
