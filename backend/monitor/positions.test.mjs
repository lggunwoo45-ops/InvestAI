import test from 'node:test'
import assert from 'node:assert/strict'
import { createPositionReader, normalizeConnection, createConnection, observeConnection, validConnection, positionRiskValues } from './positions.mjs'

const at = 1800000000000
const config = (extra = {}) => normalizeConnection({ requestId: 'position-test-1', venue: 'hyperliquid', account: `0x${'a'.repeat(40)}`, label: '테스트', notify: false, thresholds: { distance: 5, loss: 10, leverage: 20 }, ...extra })
const pos = (extra = {}) => ({ key: 'BTC:long', asset: 'BTC', side: 'long', size: 1, entryPrice: 100, currentPrice: 100, liquidationPrice: 80, unrealizedPnl: 0, leverage: 5, marginType: 'cross', quote: 'USDC', ...extra })
const snapshot = (time, positions) => ({ receivedAt: time, sourceAt: time, positions })
const response = (data, extra = {}) => new Response(JSON.stringify(data), { headers: { date: new Date(at).toUTCString(), ...extra } })

test('public adapters validate whole snapshots, normalize direction and omit unrelated account data', async () => {
  const raw = { time: at, assetPositions: [{ position: { coin: 'BTC', szi: '-2', entryPx: '100', positionValue: '220', unrealizedPnl: '-20', liquidationPx: '120', leverage: { type: 'cross', value: 5 } } }], withdrawable: '999', secret: 'omit' }
  let request
  const reader = createPositionReader(async (url, options) => { request = { url, options }; return response(raw) }, () => at)
  const result = await reader(config())
  assert.equal(result.positions[0].side, 'short'); assert.equal(result.positions[0].currentPrice, 110)
  assert.ok(!JSON.stringify(result).includes('secret')); assert.ok(!JSON.stringify(result).includes('withdrawable'))
  assert.equal(request.url, 'https://api.hyperliquid.xyz/info'); assert.equal(request.options.redirect, 'error'); assert.equal(JSON.parse(request.options.body).type, 'clearinghouseState')
  assert.equal(positionRiskValues(result.positions[0]).loss, 10)
  raw.assetPositions.push({ position: { coin: 'ETH', szi: 'broken' } })
  await assert.rejects(() => reader(config()), /불완전/)
})
test('Lighter uses a single explicit account index and never guesses leverage or source timestamp', async () => {
  const data = { code: 200, total: 1, next_cursor: '', accounts: [{ account_index: 123, positions: [{ symbol: 'ETH', sign: -1, position: '2', avg_entry_price: '100', position_value: '180', unrealized_pnl: '20', liquidation_price: '0', initial_margin_fraction: '500' }, { symbol: 'BTC', sign: 0, position: '0' }] }] }
  let request
  const read = createPositionReader(async (url, options) => { request = { url, options }; return response(data) }, () => at)
  const result = await read(config({ venue: 'lighter', account: '123' }))
  assert.match(request.url, /by=index&value=123&active_only=true$/); assert.equal(request.options.method, 'GET')
  assert.equal(result.sourceAt, null); assert.equal(result.positions.length, 1); assert.equal(result.positions[0].liquidationPrice, null); assert.equal(result.positions[0].leverage, null)
  data.next_cursor = 'more'; await assert.rejects(() => read(config({ venue: 'lighter', account: '123' })), /불완전/)
  data.next_cursor = ''; data.accounts[0].account_index = 456; await assert.rejects(() => read(config({ venue: 'lighter', account: '123' })), /불완전/)
})
test('provider clock, cache age, rate limits, invalid identifiers and oversized input cannot create fresh positions', async () => {
  const raw = { time: at - 100000, assetPositions: [] }
  await assert.rejects(() => createPositionReader(async () => response(raw), () => at)(config()), /오래/)
  raw.time = at
  await assert.rejects(() => createPositionReader(async () => response(raw, { age: '65' }), () => at)(config()), /시각/)
  const skewed = await createPositionReader(async () => response(raw), () => at + 300000)(config()); assert.equal(skewed.sourceAt, at)
  let calls = 0; const limited = createPositionReader(async () => { calls++; return new Response('', { status: 429 }) }, () => at)
  await assert.rejects(() => limited(config())); await assert.rejects(() => limited(config()), /요청 제한/); assert.equal(calls, 1)
  assert.throws(() => config({ account: 'https://evil.example' })); assert.throws(() => config({ venue: 'lighter', account: '123&by=l1_address' })); assert.throws(() => config({ thresholds: { distance: 0, loss: null, leverage: null } }))
  await assert.rejects(() => createPositionReader(async () => response({ payload: 'x'.repeat(512001) }), () => at)(config()), /불완전/)
})
test('risk transitions are deduplicated, re-arm after recovery, and never interpret a failed read as a closed position', () => {
  const c = createConnection(config(), at)
  observeConnection(c, snapshot(at, [pos()]), at)
  assert.deepEqual(c.events.map(e => e.kind), ['initial'])
  const danger = pos({ currentPrice: 82, unrealizedPnl: -18, leverage: 25 })
  observeConnection(c, snapshot(at + 30000, [danger]), at + 30000)
  assert.deepEqual(c.events.slice(1).map(e => e.kind), ['liquidation', 'loss', 'leverage'])
  observeConnection(c, snapshot(at + 60000, [danger]), at + 60000); assert.equal(c.events.length, 4)
  observeConnection(c, null, at + 90000, 'offline'); assert.equal(c.snapshot.positions.length, 1); assert.equal(c.events.length, 4)
  observeConnection(c, snapshot(at + 120000, []), at + 120000); assert.equal(c.events.at(-1).kind, 'resynced'); assert.equal(c.events.some(e => e.kind === 'closed'), false)
  observeConnection(c, snapshot(at + 150000, [pos()]), at + 150000); assert.equal(c.events.at(-1).kind, 'opened')
  observeConnection(c, snapshot(at + 180000, [danger]), at + 180000); assert.equal(c.events.filter(e => e.kind === 'loss').length, 2)
  observeConnection(c, snapshot(at + 210000, [pos({ size: 2 })]), at + 210000); assert.equal(c.events.at(-1).kind, 'resized')
  observeConnection(c, snapshot(at + 240000, []), at + 240000); assert.equal(c.events.at(-1).kind, 'closed')
  assert.equal(validConnection(c), true)
})
test('long gaps and stale snapshots preserve uncertainty; capacity stops instead of deleting prior evidence', () => {
  const c = createConnection(config(), at)
  observeConnection(c, snapshot(at, [pos()]), at)
  observeConnection(c, snapshot(at + 300000, []), at + 300000); assert.equal(c.events.at(-1).kind, 'resynced')
  const before = structuredClone(c.snapshot)
  observeConnection(c, snapshot(at, [pos()]), at + 400000); assert.deepEqual(c.snapshot, before)
  c.events = Array.from({ length: 200 }, (_, i) => ({ ...c.events[0], id: `e${i}` })); c.sequence = 200
  observeConnection(c, snapshot(at + 420000, [pos()]), at + 420000)
  assert.equal(c.active, false); assert.equal(c.events.length, 200); assert.match(c.issue, /200건/)
})
