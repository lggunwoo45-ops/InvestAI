import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readDerivativeHistory, openDerivativeStore, createDerivativeCollector, HOUR, DAY, COLLECTION_INTERVAL } from './derivatives.mjs'

const at = Date.parse('2026-10-26T12:15:00Z'), hour = Math.floor(at / HOUR) * HOUR
const cleanups = new Map()
async function directory(t) { const dir = await mkdtemp(join(tmpdir(), 'investai-derivatives-')); cleanups.set(dir, []); t.after(async () => { for (const close of cleanups.get(dir)) await close(); cleanups.delete(dir); await rm(dir, { recursive: true, force: true }) }); return dir }
function payload(metric, overrides = {}) { return { retCode: 0, time: at, result: { category: 'linear', symbol: 'BTCUSDT', list: metric === 'funding' ? [{ symbol: 'BTCUSDT', fundingRate: '-0.0001', fundingRateTimestamp: String(hour - HOUR) }] : [{ openInterest: '0', timestamp: String(hour - HOUR) }] }, ...overrides } }
const response = body => ({ ok: true, text: async () => JSON.stringify(body) })
test('public reader uses fixed endpoints, bounded seven-day requests, settled rates and base-asset units', async () => {
  for (const metric of ['funding', 'openInterest']) {
    const rows = await readDerivativeHistory('BTC', metric, at, { fetchImpl: async (url, options) => {
      const u = new URL(url); assert.equal(u.origin, 'https://api.bybit.com'); assert.equal(options.redirect, 'error'); assert.equal(u.searchParams.get('category'), 'linear'); assert.equal(u.searchParams.get('limit'), '200'); assert.equal(u.searchParams.get('symbol'), 'BTCUSDT'); return response(payload(metric))
    } })
    assert.equal(rows.length, 1); assert.equal(rows[0].value, metric === 'funding' ? -0.0001 : 0)
  }
})
test('reader rejects malformed, future, conflicting, cross-symbol and truncated data without inventing zero', async () => {
  const bad = []
  for (const field of ['null', '', 'NaN', null, false]) { const b = payload('openInterest'); b.result.list[0].openInterest = field; bad.push(b) }
  const future = payload('openInterest'); future.result.list[0].timestamp = String(hour + HOUR); bad.push(future)
  const old = payload('openInterest'); old.result.list[0].timestamp = String(hour - 8 * DAY); bad.push(old)
  const conflict = payload('openInterest'); conflict.result.list.push({ ...conflict.result.list[0], openInterest: '4' }); bad.push(conflict)
  const symbol = payload('openInterest'); symbol.result.symbol = 'ETHUSDT'; bad.push(symbol)
  const paged = payload('openInterest'); paged.result.nextPageCursor = 'more'; bad.push(paged)
  bad.push(payload('openInterest', { retCode: 10006 }), payload('openInterest', { time: at - HOUR }))
  for (const body of bad) await assert.rejects(readDerivativeHistory('BTC', 'openInterest', at, { fetchImpl: async () => response(body) }))
  await assert.rejects(readDerivativeHistory('BTC', 'funding', at, { fetchImpl: async () => ({ ok: true, text: async () => 'x'.repeat(150001) }) }), /too_large/)
})
test('SQLite survives reopen, deduplicates retries, preserves corrections and prevents look-ahead', async t => {
  const dir = await directory(t); let time = at, store = openDerivativeStore(dir, () => time)
  store.save('BTC', 'funding', [{ at: hour, value: .001 }]); store.save('BTC', 'funding', [{ at: hour, value: .001 }])
  assert.equal(store.db.prepare('SELECT count(*) n FROM observations').get().n, 1)
  assert.equal(store.rows('BTC', 'funding', hour, hour, at - 1).length, 0)
  time += COLLECTION_INTERVAL; store.save('BTC', 'funding', [{ at: hour, value: .002 }]); store.close()
  store = openDerivativeStore(dir, () => time); cleanups.get(dir).push(() => store.close())
  assert.equal(store.rows('BTC', 'funding', hour, hour, at)[0].value, .001)
  assert.equal(store.rows('BTC', 'funding', hour, hour)[0].value, .002)
  assert.equal(store.rows('BTC', 'funding', hour, hour)[0].knownAt, time)
  assert.equal(store.rows('ETH', 'funding', hour, hour).length, 0)
  assert.throws(() => store.save('BTC', 'openInterest', [{ at: hour, value: 5 }, { at: hour + HOUR, value: 5 }]))
  assert.equal(store.rows('BTC', 'openInterest', hour, hour).length, 0, 'atomic rollback')
})
test('collector runs without visitors, retries failures, repairs recent gaps and keeps old records on restart', async t => {
  const dir = await directory(t); let time = at, calls = 0, failing = false, repaired = false
  const reader = async (_asset, metric) => { calls++; if (failing && metric === 'openInterest') throw new Error('offline'); return metric === 'funding' ? [{ at: hour - 4 * HOUR, value: .0001 }] : [hour - 3 * HOUR, ...(repaired ? [hour - 2 * HOUR] : []), hour - HOUR].map(at => ({ at, value: 100 })) }
  let collector = createDerivativeCollector({ directory: dir, assets: ['BTC'], clock: () => time, reader, autoStart: false })
  await collector.tick(); await collector.tick(); assert.equal(calls, 2)
  let snapshot = collector.snapshot('BTC', 7)
  assert.equal(snapshot.series[1].status, 'available'); assert.ok(snapshot.series[1].gaps.some(g => g.from === hour - 2 * HOUR && g.to === hour - 2 * HOUR))
  assert.equal(snapshot.series[0].gaps, null, 'variable funding interval is not guessed')
  const succeeded = snapshot.series[1].succeededAt
  failing = true; time += COLLECTION_INTERVAL; await collector.tick(); snapshot = collector.snapshot('BTC', 7)
  assert.equal(snapshot.series[1].status, 'stale'); assert.equal(snapshot.series[1].succeededAt, succeeded); assert.equal(snapshot.series[1].points.length, 2)
  await collector.close(); collector = createDerivativeCollector({ directory: dir, assets: ['BTC'], clock: () => time, reader, autoStart: false }); cleanups.get(dir).push(() => collector.close())
  assert.equal(collector.snapshot('BTC', 7).series[1].points.length, 2)
  time += COLLECTION_INTERVAL; failing = false; repaired = true; await collector.tick()
  assert.equal(collector.snapshot('BTC', 7).series[1].points.length, 3)
  assert.ok(!collector.snapshot('BTC', 7).series[1].gaps.some(g => g.from === hour - 2 * HOUR))
  assert.ok(collector.snapshot('BTC', 30).series[1].gaps[0].to < hour - 3 * HOUR, 'precollection history remains explicitly missing')
})
test('collector leases prevent overlapping writers and close aborts in-flight requests safely', async t => {
  const dir = await directory(t); let calls = 0, began
  const started = new Promise(r => { began = r })
  const reader = async (_a, _m, _e, { signal }) => { calls++; began(); return new Promise((_r, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) }
  const one = createDerivativeCollector({ directory: dir, assets: ['BTC'], clock: () => at, reader, autoStart: false })
  const two = createDerivativeCollector({ directory: dir, assets: ['BTC'], clock: () => at, reader: async () => { calls++; return [] }, autoStart: false })
  const work = one.tick(); await started; await two.tick(); assert.equal(calls, 1)
  await one.close(); await work; await two.close()
})
test('retention deletes old records and stale providers cannot claim fresh values', async t => {
  const dir = await directory(t), store = openDerivativeStore(dir, () => at)
  store.save('BTC', 'funding', [{ at: hour - 366 * DAY, value: .001 }, { at: hour - DAY, value: .002 }]); store.close()
  const collector = createDerivativeCollector({ directory: dir, assets: ['BTC'], clock: () => at, reader: async () => [], autoStart: false }); cleanups.get(dir).push(() => collector.close())
  await collector.tick(); assert.equal(collector.snapshot('BTC', 7).series[0].status, 'stale')
  const check = openDerivativeStore(dir); assert.equal(check.db.prepare('SELECT count(*) n FROM observations').get().n, 1); check.close()
  assert.throws(() => collector.snapshot('BAD', 7)); assert.throws(() => collector.snapshot('BTC', 365))
})
